export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bike_model_parts: {
        Row: {
          bike_model_id: string
          id: string
          notes: string | null
          part_id: string | null
          part_name_override: string | null
          quantity: number
          sort_order: number
          tenant_id: string | null
          unit_cost: number | null
        }
        Insert: {
          bike_model_id: string
          id?: string
          notes?: string | null
          part_id?: string | null
          part_name_override?: string | null
          quantity?: number
          sort_order?: number
          tenant_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          bike_model_id?: string
          id?: string
          notes?: string | null
          part_id?: string | null
          part_name_override?: string | null
          quantity?: number
          sort_order?: number
          tenant_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bike_model_parts_bike_model_id_fkey"
            columns: ["bike_model_id"]
            isOneToOne: false
            referencedRelation: "bike_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_model_parts_bike_model_id_fkey"
            columns: ["bike_model_id"]
            isOneToOne: false
            referencedRelation: "bike_models_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_model_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_model_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_model_parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_models: {
        Row: {
          alert_stock: number
          brand: string | null
          category: string | null
          color: string | null
          cost_mode: string
          cost_price: number | null
          created_at: string
          description: string | null
          frame_size: string | null
          id: string
          images: string[] | null
          installment_count: number | null
          installment_count_ecommerce: number | null
          installment_count_store: number | null
          installment_price: number | null
          installment_value_ecommerce: number | null
          installment_value_store: number | null
          installments_enabled_ecommerce: boolean | null
          installments_enabled_store: boolean | null
          name: string
          pix_price: number | null
          price_ecommerce: number | null
          price_store: number | null
          rim_size: string | null
          sale_price: number | null
          sku: string | null
          stock_qty: number
          tenant_id: string | null
          updated_at: string
          visible_on_storefront: boolean
          weight_kg: number | null
        }
        Insert: {
          alert_stock?: number
          brand?: string | null
          category?: string | null
          color?: string | null
          cost_mode?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          frame_size?: string | null
          id?: string
          images?: string[] | null
          installment_count?: number | null
          installment_count_ecommerce?: number | null
          installment_count_store?: number | null
          installment_price?: number | null
          installment_value_ecommerce?: number | null
          installment_value_store?: number | null
          installments_enabled_ecommerce?: boolean | null
          installments_enabled_store?: boolean | null
          name: string
          pix_price?: number | null
          price_ecommerce?: number | null
          price_store?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number
          tenant_id?: string | null
          updated_at?: string
          visible_on_storefront?: boolean
          weight_kg?: number | null
        }
        Update: {
          alert_stock?: number
          brand?: string | null
          category?: string | null
          color?: string | null
          cost_mode?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          frame_size?: string | null
          id?: string
          images?: string[] | null
          installment_count?: number | null
          installment_count_ecommerce?: number | null
          installment_count_store?: number | null
          installment_price?: number | null
          installment_value_ecommerce?: number | null
          installment_value_store?: number | null
          installments_enabled_ecommerce?: boolean | null
          installments_enabled_store?: boolean | null
          name?: string
          pix_price?: number | null
          price_ecommerce?: number | null
          price_store?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number
          tenant_id?: string | null
          updated_at?: string
          visible_on_storefront?: boolean
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bike_models_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_service_history: {
        Row: {
          bike_name: string
          completed_at: string | null
          created_at: string | null
          customer_cpf: string | null
          customer_name: string | null
          customer_phone: string | null
          frame_number: string
          id: string
          mechanic_id: string | null
          mechanic_name: string | null
          problem: string
          service_order_id: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          bike_name: string
          completed_at?: string | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          frame_number: string
          id?: string
          mechanic_id?: string | null
          mechanic_name?: string | null
          problem: string
          service_order_id?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          bike_name?: string
          completed_at?: string | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          frame_number?: string
          id?: string
          mechanic_id?: string | null
          mechanic_name?: string | null
          problem?: string
          service_order_id?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bike_service_history_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_service_history_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_service_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number | null
          bank_name: string | null
          barcode: string
          barcode_type: string
          beneficiary: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          amount?: number | null
          bank_name?: string | null
          barcode: string
          barcode_type?: string
          beneficiary?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number | null
          bank_name?: string | null
          barcode?: string
          barcode_type?: string
          beneficiary?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_sales: {
        Row: {
          amount: number
          cash_register_id: string
          created_at: string
          id: string
          sale_id: string
          tenant_id: string | null
        }
        Insert: {
          amount?: number
          cash_register_id: string
          created_at?: string
          id?: string
          sale_id: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          cash_register_id?: string
          created_at?: string
          id?: string
          sale_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sales_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          opened_at: string
          opened_by: string | null
          opening_amount: number
          status: string
          tenant_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: string
          tenant_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          cep: string | null
          cpf: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          tenant_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          cep?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          cep?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean | null
          created_at: string | null
          department: string | null
          email: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          department?: string | null
          email: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      face_embeddings: {
        Row: {
          created_at: string | null
          descriptor: Json
          employee_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          descriptor: Json
          employee_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          descriptor?: Json
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "face_embeddings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expenses: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          id: string
          name: string
          notes: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          period: string
          reference_date: string
          target_value: number
          tenant_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          period: string
          reference_date: string
          target_value: number
          tenant_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          period?: string
          reference_date?: string
          target_value?: number
          tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_call_replies: {
        Row: {
          call_id: string
          created_at: string | null
          created_by: string
          created_by_name: string
          id: string
          message: string
          tenant_id: string | null
        }
        Insert: {
          call_id: string
          created_at?: string | null
          created_by: string
          created_by_name: string
          id?: string
          message: string
          tenant_id?: string | null
        }
        Update: {
          call_id?: string
          created_at?: string | null
          created_by?: string
          created_by_name?: string
          id?: string
          message?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_call_replies_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "internal_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_call_replies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_call_views: {
        Row: {
          call_id: string
          id: string
          tenant_id: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          call_id: string
          id?: string
          tenant_id?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          call_id?: string
          id?: string
          tenant_id?: string | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_call_views_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "internal_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_call_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_calls: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          created_at: string | null
          created_by: string
          created_by_name: string
          id: string
          message: string
          target_role: string | null
          target_type: string
          target_user_id: string | null
          tenant_id: string | null
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          created_at?: string | null
          created_by: string
          created_by_name: string
          id?: string
          message: string
          target_role?: string | null
          target_type?: string
          target_user_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          created_at?: string | null
          created_by?: string
          created_by_name?: string
          id?: string
          message?: string
          target_role?: string | null
          target_type?: string
          target_user_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lucky_numbers: {
        Row: {
          created_at: string
          id: string
          number: string
          score: number
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          number: string
          score?: number
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          number?: string
          score?: number
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lucky_numbers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_job_additions: {
        Row: {
          approval: string
          created_at: string
          id: string
          job_id: string
          labor_cost: number
          parts_used: Json
          price: number
          problem: string
          tenant_id: string | null
        }
        Insert: {
          approval?: string
          created_at?: string
          id?: string
          job_id: string
          labor_cost?: number
          parts_used?: Json
          price?: number
          problem: string
          tenant_id?: string | null
        }
        Update: {
          approval?: string
          created_at?: string
          id?: string
          job_id?: string
          labor_cost?: number
          parts_used?: Json
          price?: number
          problem?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_job_additions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mechanic_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_job_additions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_jobs: {
        Row: {
          bike_name: string | null
          created_at: string
          customer_cpf: string | null
          customer_id: string | null
          customer_name: string | null
          customer_whatsapp: string | null
          id: string
          price: number
          problem: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          bike_name?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_whatsapp?: string | null
          id?: string
          price?: number
          problem: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          bike_name?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_whatsapp?: string | null
          id?: string
          price?: number
          problem?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanics: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          hide_sensitive: boolean
          id: string
          module: Database["public"]["Enums"]["app_module"]
          tenant_member_id: string
          updated_at: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          hide_sensitive?: boolean
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          tenant_member_id: string
          updated_at?: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          hide_sensitive?: boolean
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          tenant_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_permissions_tenant_member_id_fkey"
            columns: ["tenant_member_id"]
            isOneToOne: false
            referencedRelation: "tenant_members"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          alert_stock: number
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          frame_size: string | null
          gears: string | null
          hub_style: string | null
          id: string
          images: string[] | null
          installment_count: number | null
          installment_price: number | null
          material: string | null
          name: string
          notes: string | null
          pix_price: number | null
          price_ecommerce: number | null
          price_store: number | null
          rim_size: string | null
          sale_price: number | null
          sku: string | null
          stock_qty: number
          tenant_id: string | null
          unit_cost: number | null
          updated_at: string
          visible_on_storefront: boolean
          weight_capacity_kg: number | null
        }
        Insert: {
          alert_stock?: number
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          frame_size?: string | null
          gears?: string | null
          hub_style?: string | null
          id?: string
          images?: string[] | null
          installment_count?: number | null
          installment_price?: number | null
          material?: string | null
          name: string
          notes?: string | null
          pix_price?: number | null
          price_ecommerce?: number | null
          price_store?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number
          tenant_id?: string | null
          unit_cost?: number | null
          updated_at?: string
          visible_on_storefront?: boolean
          weight_capacity_kg?: number | null
        }
        Update: {
          alert_stock?: number
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          frame_size?: string | null
          gears?: string | null
          hub_style?: string | null
          id?: string
          images?: string[] | null
          installment_count?: number | null
          installment_price?: number | null
          material?: string | null
          name?: string
          notes?: string | null
          pix_price?: number | null
          price_ecommerce?: number | null
          price_store?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number
          tenant_id?: string | null
          unit_cost?: number | null
          updated_at?: string
          visible_on_storefront?: boolean
          weight_capacity_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean | null
          applies_to: string
          bike_model_id: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string
          id: string
          name: string
          product_id: string | null
          scope: string
          starts_at: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          applies_to?: string
          bike_model_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string
          id?: string
          name: string
          product_id?: string | null
          scope?: string
          starts_at?: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          applies_to?: string
          bike_model_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string
          id?: string
          name?: string
          product_id?: string | null
          scope?: string
          starts_at?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_bike_model_id_fkey"
            columns: ["bike_model_id"]
            isOneToOne: false
            referencedRelation: "bike_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_bike_model_id_fkey"
            columns: ["bike_model_id"]
            isOneToOne: false
            referencedRelation: "bike_models_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "parts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          id: string
          part_id: string | null
          part_name: string
          quantity: number
          quote_id: string
          tenant_id: string | null
          unit_cost: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          part_id?: string | null
          part_name: string
          quantity?: number
          quote_id: string
          tenant_id?: string | null
          unit_cost?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          part_id?: string | null
          part_name?: string
          quantity?: number
          quote_id?: string
          tenant_id?: string | null
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          customer_cpf: string | null
          customer_id: string | null
          customer_name: string | null
          customer_whatsapp: string | null
          id: string
          labor_cost: number
          notes: string | null
          responsible_name: string | null
          status: string
          tenant_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_whatsapp?: string | null
          id?: string
          labor_cost?: number
          notes?: string | null
          responsible_name?: string | null
          status?: string
          tenant_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_whatsapp?: string | null
          id?: string
          labor_cost?: number
          notes?: string | null
          responsible_name?: string | null
          status?: string
          tenant_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          bike_model_id: string | null
          description: string
          id: string
          part_id: string | null
          quantity: number
          sale_id: string
          tenant_id: string | null
          unit_price: number
        }
        Insert: {
          bike_model_id?: string | null
          description: string
          id?: string
          part_id?: string | null
          quantity?: number
          sale_id: string
          tenant_id?: string | null
          unit_price?: number
        }
        Update: {
          bike_model_id?: string | null
          description?: string
          id?: string
          part_id?: string | null
          quantity?: number
          sale_id?: string
          tenant_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_bike_model_id_fkey"
            columns: ["bike_model_id"]
            isOneToOne: false
            referencedRelation: "bike_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_bike_model_id_fkey"
            columns: ["bike_model_id"]
            isOneToOne: false
            referencedRelation: "bike_models_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          card_fee: number | null
          card_tax_percent: number | null
          created_at: string
          customer_id: string | null
          discount_amount: number | null
          discount_type: string | null
          id: string
          notes: string | null
          payment_method: string | null
          promotion_id: string | null
          responsible_name: string | null
          status: string
          tenant_id: string | null
          total: number
        }
        Insert: {
          card_fee?: number | null
          card_tax_percent?: number | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          promotion_id?: string | null
          responsible_name?: string | null
          status?: string
          tenant_id?: string | null
          total?: number
        }
        Update: {
          card_fee?: number | null
          card_tax_percent?: number | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          promotion_id?: string | null
          responsible_name?: string | null
          status?: string
          tenant_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          bike_name: string | null
          completed_at: string | null
          created_at: string | null
          customer_cpf: string | null
          customer_id: string | null
          customer_name: string | null
          customer_whatsapp: string | null
          frame_number: string | null
          id: string
          mechanic_id: string | null
          mechanic_name: string | null
          mechanic_status: string | null
          price: number | null
          problem: string
          responsible_name: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          bike_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_whatsapp?: string | null
          frame_number?: string | null
          id?: string
          mechanic_id?: string | null
          mechanic_name?: string | null
          mechanic_status?: string | null
          price?: number | null
          problem: string
          responsible_name?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bike_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_whatsapp?: string | null
          frame_number?: string | null
          id?: string
          mechanic_id?: string | null
          mechanic_name?: string | null
          mechanic_status?: string | null
          price?: number | null
          problem?: string
          responsible_name?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          tenant_id: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          tenant_id?: string | null
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          tenant_id?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_changes: {
        Row: {
          created_at: string
          id: string
          new_qty: number
          old_qty: number
          product_id: string
          product_name: string
          product_type: string
          responsible_name: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_qty: number
          old_qty: number
          product_id: string
          product_name: string
          product_type: string
          responsible_name?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_qty?: number
          old_qty?: number
          product_id?: string
          product_name?: string
          product_type?: string
          responsible_name?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string
          item_type: string
          notes: string | null
          quantity: number
          supplier_name: string | null
          tenant_id: string | null
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id: string
          item_type: string
          notes?: string | null
          quantity: number
          supplier_name?: string | null
          tenant_id?: string | null
          unit_cost?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string
          item_type?: string
          notes?: string | null
          quantity?: number
          supplier_name?: string | null
          tenant_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      time_records: {
        Row: {
          confidence: number | null
          date: string | null
          employee_id: string
          id: string
          timestamp: string | null
          type: string
        }
        Insert: {
          confidence?: number | null
          date?: string | null
          employee_id: string
          id?: string
          timestamp?: string | null
          type: string
        }
        Update: {
          confidence?: number | null
          date?: string | null
          employee_id?: string
          id?: string
          timestamp?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      variable_expenses: {
        Row: {
          amount: number
          created_at: string
          expense_date: string
          id: string
          name: string
          notes: string | null
          tenant_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          expense_date?: string
          id?: string
          name: string
          notes?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          expense_date?: string
          id?: string
          name?: string
          notes?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variable_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          ai_enabled: boolean
          contact_lid: string | null
          contact_name: string | null
          contact_phone: string
          contact_photo: string | null
          created_at: string
          id: string
          instance_name: string | null
          last_message: string | null
          last_message_at: string | null
          status: string
          tenant_id: string | null
          unread_count: number | null
        }
        Insert: {
          ai_enabled?: boolean
          contact_lid?: string | null
          contact_name?: string | null
          contact_phone: string
          contact_photo?: string | null
          created_at?: string
          id?: string
          instance_name?: string | null
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          tenant_id?: string | null
          unread_count?: number | null
        }
        Update: {
          ai_enabled?: boolean
          contact_lid?: string | null
          contact_name?: string | null
          contact_phone?: string
          contact_photo?: string | null
          created_at?: string
          id?: string
          instance_name?: string | null
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          tenant_id?: string | null
          unread_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instance_settings: {
        Row: {
          ai_enabled: boolean
          instance_name: string
          updated_at: string | null
        }
        Insert: {
          ai_enabled?: boolean
          instance_name: string
          updated_at?: string | null
        }
        Update: {
          ai_enabled?: boolean
          instance_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          from_me: boolean
          id: string
          media_url: string | null
          message_id: string | null
          status: string | null
          tenant_id: string | null
          type: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          from_me?: boolean
          id?: string
          media_url?: string | null
          message_id?: string | null
          status?: string | null
          tenant_id?: string | null
          type?: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          from_me?: boolean
          id?: string
          media_url?: string | null
          message_id?: string | null
          status?: string | null
          tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bike_model_parts_public: {
        Row: {
          bike_model_id: string | null
          id: string | null
          notes: string | null
          part_id: string | null
          part_name_override: string | null
          quantity: number | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bike_model_parts_bike_model_id_fkey"
            columns: ["bike_model_id"]
            isOneToOne: false
            referencedRelation: "bike_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_model_parts_bike_model_id_fkey"
            columns: ["bike_model_id"]
            isOneToOne: false
            referencedRelation: "bike_models_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_model_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_model_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_models_public: {
        Row: {
          brand: string | null
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          frame_size: string | null
          id: string | null
          images: string[] | null
          installment_count: number | null
          installment_count_ecommerce: number | null
          installment_count_store: number | null
          installment_price: number | null
          installment_value_ecommerce: number | null
          installment_value_store: number | null
          installments_enabled_ecommerce: boolean | null
          installments_enabled_store: boolean | null
          name: string | null
          pix_price: number | null
          price_ecommerce: number | null
          price_store: number | null
          rim_size: string | null
          sale_price: number | null
          sku: string | null
          stock_qty: number | null
          updated_at: string | null
          visible_on_storefront: boolean | null
          weight_kg: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          frame_size?: string | null
          id?: string | null
          images?: string[] | null
          installment_count?: number | null
          installment_count_ecommerce?: number | null
          installment_count_store?: number | null
          installment_price?: number | null
          installment_value_ecommerce?: number | null
          installment_value_store?: number | null
          installments_enabled_ecommerce?: boolean | null
          installments_enabled_store?: boolean | null
          name?: string | null
          pix_price?: number | null
          price_ecommerce?: number | null
          price_store?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number | null
          updated_at?: string | null
          visible_on_storefront?: boolean | null
          weight_kg?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          frame_size?: string | null
          id?: string | null
          images?: string[] | null
          installment_count?: number | null
          installment_count_ecommerce?: number | null
          installment_count_store?: number | null
          installment_price?: number | null
          installment_value_ecommerce?: number | null
          installment_value_store?: number | null
          installments_enabled_ecommerce?: boolean | null
          installments_enabled_store?: boolean | null
          name?: string | null
          pix_price?: number | null
          price_ecommerce?: number | null
          price_store?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number | null
          updated_at?: string | null
          visible_on_storefront?: boolean | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      parts_public: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          frame_size: string | null
          gears: string | null
          hub_style: string | null
          id: string | null
          images: string[] | null
          installment_count: number | null
          installment_price: number | null
          material: string | null
          name: string | null
          notes: string | null
          pix_price: number | null
          price_ecommerce: number | null
          price_store: number | null
          rim_size: string | null
          sale_price: number | null
          sku: string | null
          stock_qty: number | null
          updated_at: string | null
          visible_on_storefront: boolean | null
          weight_capacity_kg: number | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          frame_size?: string | null
          gears?: string | null
          hub_style?: string | null
          id?: string | null
          images?: string[] | null
          installment_count?: number | null
          installment_price?: number | null
          material?: string | null
          name?: string | null
          notes?: string | null
          pix_price?: number | null
          price_ecommerce?: number | null
          price_store?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number | null
          updated_at?: string | null
          visible_on_storefront?: boolean | null
          weight_capacity_kg?: number | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          frame_size?: string | null
          gears?: string | null
          hub_style?: string | null
          id?: string | null
          images?: string[] | null
          installment_count?: number | null
          installment_price?: number | null
          material?: string | null
          name?: string | null
          notes?: string | null
          pix_price?: number | null
          price_ecommerce?: number | null
          price_store?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number | null
          updated_at?: string | null
          visible_on_storefront?: boolean | null
          weight_capacity_kg?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      get_user_tenant_member_id: { Args: { _user_id: string }; Returns: string }
      has_module_access: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_owner: { Args: { _user_id: string }; Returns: boolean }
      should_hide_sensitive: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_module:
        | "dashboard"
        | "dre"
        | "produtos"
        | "bikes"
        | "estoque"
        | "pdv"
        | "caixa"
        | "historico"
        | "mecanica"
        | "gastos"
        | "clientes"
        | "whatsapp"
        | "configuracoes"
        | "orcamentos"
        | "mecanicos"
        | "mecanicos_historico"
      tenant_role: "owner" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_module: [
        "dashboard",
        "dre",
        "produtos",
        "bikes",
        "estoque",
        "pdv",
        "caixa",
        "historico",
        "mecanica",
        "gastos",
        "clientes",
        "whatsapp",
        "configuracoes",
        "orcamentos",
        "mecanicos",
        "mecanicos_historico",
      ],
      tenant_role: ["owner", "member"],
    },
  },
} as const
