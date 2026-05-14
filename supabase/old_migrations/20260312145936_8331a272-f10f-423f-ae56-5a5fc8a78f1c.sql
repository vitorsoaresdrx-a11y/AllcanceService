
-- ============================================================
-- 1. PUBLIC PRODUCT VIEWS (exclude cost columns, filter visible)
-- ============================================================

CREATE VIEW public.parts_public
WITH (security_invoker = on) AS
SELECT id, name, sku, category, material, gears, hub_style, color, rim_size, frame_size,
       sale_price, pix_price, installment_price, installment_count,
       stock_qty, alert_stock, images, notes, weight_capacity_kg,
       visible_on_storefront, created_at, updated_at
FROM public.parts
WHERE visible_on_storefront = true;

CREATE VIEW public.bike_models_public
WITH (security_invoker = on) AS
SELECT id, name, sku, category, brand, frame_size, rim_size, color, weight_kg,
       sale_price, pix_price, installment_price, installment_count,
       stock_qty, alert_stock, images, description, cost_mode,
       visible_on_storefront, created_at, updated_at
FROM public.bike_models
WHERE visible_on_storefront = true;

CREATE VIEW public.bike_model_parts_public
WITH (security_invoker = on) AS
SELECT bmp.id, bmp.bike_model_id, bmp.part_id, bmp.part_name_override,
       bmp.quantity, bmp.sort_order, bmp.notes
FROM public.bike_model_parts bmp
JOIN public.bike_models bm ON bm.id = bmp.bike_model_id
WHERE bm.visible_on_storefront = true;

-- ============================================================
-- 2. RESTRICT ANON SELECT on base tables
-- ============================================================

DROP POLICY IF EXISTS "Anyone can read parts" ON public.parts;
DROP POLICY IF EXISTS "Anyone can read bike_models" ON public.bike_models;
DROP POLICY IF EXISTS "Anyone can read bike_model_parts" ON public.bike_model_parts;

CREATE POLICY "Anon can read visible parts"
ON public.parts FOR SELECT TO anon
USING (visible_on_storefront = true);

CREATE POLICY "Anon can read visible bike_models"
ON public.bike_models FOR SELECT TO anon
USING (visible_on_storefront = true);

CREATE POLICY "Anon can read bike_model_parts for visible bikes"
ON public.bike_model_parts FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.bike_models bm
    WHERE bm.id = bike_model_parts.bike_model_id
    AND bm.visible_on_storefront = true
  )
);

-- ============================================================
-- 3. FIX CROSS-TENANT OWNER ESCALATION on tenant_members
-- ============================================================

DROP POLICY IF EXISTS "Owner can insert members" ON public.tenant_members;
CREATE POLICY "Owner can insert members to own tenant"
ON public.tenant_members FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_owner(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Owner can update members" ON public.tenant_members;
CREATE POLICY "Owner can update own tenant members"
ON public.tenant_members FOR UPDATE TO authenticated
USING (
  is_tenant_owner(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
)
WITH CHECK (
  is_tenant_owner(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Owner can delete members" ON public.tenant_members;
CREATE POLICY "Owner can delete own tenant members"
ON public.tenant_members FOR DELETE TO authenticated
USING (
  is_tenant_owner(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);

-- ============================================================
-- 4. FIX CROSS-TENANT on module_permissions
-- ============================================================

DROP POLICY IF EXISTS "Owner can insert permissions" ON public.module_permissions;
CREATE POLICY "Owner can insert own tenant permissions"
ON public.module_permissions FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.id = module_permissions.tenant_member_id
    AND tm.tenant_id = get_user_tenant_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Owner can read all permissions" ON public.module_permissions;
CREATE POLICY "Owner can read own tenant permissions"
ON public.module_permissions FOR SELECT TO authenticated
USING (
  is_tenant_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.id = module_permissions.tenant_member_id
    AND tm.tenant_id = get_user_tenant_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Owner can update permissions" ON public.module_permissions;
CREATE POLICY "Owner can update own tenant permissions"
ON public.module_permissions FOR UPDATE TO authenticated
USING (
  is_tenant_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.id = module_permissions.tenant_member_id
    AND tm.tenant_id = get_user_tenant_id(auth.uid())
  )
)
WITH CHECK (
  is_tenant_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.id = module_permissions.tenant_member_id
    AND tm.tenant_id = get_user_tenant_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Owner can delete permissions" ON public.module_permissions;
CREATE POLICY "Owner can delete own tenant permissions"
ON public.module_permissions FOR DELETE TO authenticated
USING (
  is_tenant_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.id = module_permissions.tenant_member_id
    AND tm.tenant_id = get_user_tenant_id(auth.uid())
  )
);

-- ============================================================
-- 5. REMOVE ANON ACCESS FROM WHATSAPP TABLES
-- ============================================================

DROP POLICY IF EXISTS "Anon can select whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Anon can insert whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Anon can update whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Anon can insert whatsapp_messages" ON public.whatsapp_messages;
