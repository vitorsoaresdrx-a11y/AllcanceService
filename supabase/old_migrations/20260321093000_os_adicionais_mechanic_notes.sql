-- Add mechanic_notes to os_adicionais
ALTER TABLE os_adicionais ADD COLUMN IF NOT EXISTS mechanic_notes TEXT;

-- Update check constraint for os_pagamentos_historico.tipo
DO $$ 
BEGIN 
    ALTER TABLE os_pagamentos_historico DROP CONSTRAINT IF EXISTS os_pagamentos_historico_tipo_check;
    ALTER TABLE os_pagamentos_historico ADD CONSTRAINT os_pagamentos_historico_tipo_check 
        CHECK (tipo IN ('parcial', 'integral', 'desconto', 'adicional_aprovado'));
EXCEPTION 
    WHEN undefined_table THEN RAISE NOTICE 'Table not found';
END $$;

-- Trigger to handle additional repair approval
CREATE OR REPLACE FUNCTION handle_os_adicional_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
    v_customer_name TEXT;
    v_customer_whatsapp TEXT;
BEGIN
    -- Only run when status changes to 'aprovado'
    IF (NEW.status = 'aprovado' AND OLD.status != 'aprovado') THEN
        
        -- 1. Update os_pagamentos.valor_restante
        UPDATE os_pagamentos 
        SET valor_restante = COALESCE(valor_restante, 0) + COALESCE(NEW.valor_total, 0)
        WHERE os_id = NEW.os_id;

        -- 2. Fetch customer info from mechanic_jobs for the history log
        SELECT customer_id, customer_name, customer_whatsapp 
        INTO v_customer_id, v_customer_name, v_customer_whatsapp
        FROM mechanic_jobs WHERE id = NEW.os_id;

        -- 3. Insert into os_pagamentos_historico
        INSERT INTO os_pagamentos_historico (
            os_id, 
            valor, 
            tipo, 
            desconto_valor, 
            desconto_motivo, -- Using this to store the addition description
            customer_id, 
            customer_name, 
            customer_whatsapp
        ) VALUES (
            NEW.os_id, 
            COALESCE(NEW.valor_total, 0), 
            'adicional_aprovado', 
            0,
            COALESCE(NEW.problem, 'Adicional aprovado'), -- The 'problem' field contains the addition description
            v_customer_id, 
            v_customer_name, 
            v_customer_whatsapp
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_os_adicional_approval ON os_adicionais;
CREATE TRIGGER tr_os_adicional_approval
AFTER UPDATE ON os_adicionais
FOR EACH ROW
EXECUTE FUNCTION handle_os_adicional_approval();
