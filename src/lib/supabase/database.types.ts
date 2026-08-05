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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          bucket: string
          byte_size: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          filename: string
          id: string
          mime_type: string
          order_id: string | null
          organization_id: string
          path: string
        }
        Insert: {
          bucket?: string
          byte_size: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          filename: string
          id?: string
          mime_type: string
          order_id?: string | null
          organization_id: string
          path: string
        }
        Update: {
          bucket?: string
          byte_size?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          filename?: string
          id?: string
          mime_type?: string
          order_id?: string | null
          organization_id?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          payload: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          payload?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          archived_at: string | null
          city: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          mobile: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          price_list_id: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          mobile?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          price_list_id?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          mobile?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          price_list_id?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          document_type: string
          last_value: number
          organization_id: string
          year: number
        }
        Insert: {
          document_type: string
          last_value?: number
          organization_id: string
          year: number
        }
        Update: {
          document_type?: string
          last_value?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          order_id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          order_id: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          description_snapshot: string
          discount_pct: number
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          quantity: number
          tax_rate_snapshot: number
          unit: string
          unit_price: number
        }
        Insert: {
          description_snapshot: string
          discount_pct?: number
          id?: string
          line_total?: number
          order_id: string
          product_id?: string | null
          quantity: number
          tax_rate_snapshot?: number
          unit?: string
          unit_price: number
        }
        Update: {
          description_snapshot?: string
          discount_pct?: number
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          quantity?: number
          tax_rate_snapshot?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_address_snapshot: string | null
          customer_id: string
          customer_name_snapshot: string
          delivered_at: string | null
          id: string
          notes: string | null
          number: string
          organization_id: string
          sales_rep_id: string | null
          source_quote_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_address_snapshot?: string | null
          customer_id: string
          customer_name_snapshot: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          number: string
          organization_id: string
          sales_rep_id?: string | null
          source_quote_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_address_snapshot?: string | null
          customer_id?: string
          customer_name_snapshot?: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          number?: string
          organization_id?: string
          sales_rep_id?: string | null
          source_quote_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_quote_id_fkey"
            columns: ["source_quote_id"]
            isOneToOne: true
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          tax_id: string | null
          timezone: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          tax_id?: string | null
          timezone?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          tax_id?: string | null
          timezone?: string
        }
        Relationships: []
      }
      price_list_items: {
        Row: {
          price_list_id: string
          product_id: string
          unit_price: number
        }
        Insert: {
          price_list_id: string
          product_id: string
          unit_price: number
        }
        Update: {
          price_list_id?: string
          product_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          archived_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          archived_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          archived_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_families: {
        Row: {
          archived_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          archived_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          archived_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_families_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          base_price: number
          code: string
          created_at: string
          default_tax_rate_id: string | null
          description: string | null
          family_id: string | null
          id: string
          minimum_stock: number
          name: string
          organization_id: string
          stock_unit: string
          track_stock: boolean
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          base_price?: number
          code: string
          created_at?: string
          default_tax_rate_id?: string | null
          description?: string | null
          family_id?: string | null
          id?: string
          minimum_stock?: number
          name: string
          organization_id: string
          stock_unit?: string
          track_stock?: boolean
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          base_price?: number
          code?: string
          created_at?: string
          default_tax_rate_id?: string | null
          description?: string | null
          family_id?: string | null
          id?: string
          minimum_stock?: number
          name?: string
          organization_id?: string
          stock_unit?: string
          track_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_default_tax_rate_id_fkey"
            columns: ["default_tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_sales_rep: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_sales_rep?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_sales_rep?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_lines: {
        Row: {
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          product_id: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number
          unit_price?: number
        }
        Update: {
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          number: string
          organization_id: string
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          number: string
          organization_id: string
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          number?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipt_lines: {
        Row: {
          purchase_order_line_id: string
          quantity: number
          receipt_id: string
        }
        Insert: {
          purchase_order_line_id: string
          quantity: number
          receipt_id: string
        }
        Update: {
          purchase_order_line_id?: string
          quantity?: number
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipt_lines_purchase_order_line_id_fkey"
            columns: ["purchase_order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipt_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "purchase_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipts: {
        Row: {
          created_by: string | null
          id: string
          idempotency_key: string
          organization_id: string
          purchase_order_id: string
          received_at: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          idempotency_key: string
          organization_id: string
          purchase_order_id: string
          received_at?: string
        }
        Update: {
          created_by?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string
          purchase_order_id?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          description_snapshot: string
          discount_pct: number
          id: string
          line_total: number
          product_id: string | null
          quantity: number
          quote_id: string
          tax_rate_snapshot: number
          unit: string
          unit_price: number
        }
        Insert: {
          description_snapshot: string
          discount_pct?: number
          id?: string
          line_total?: number
          product_id?: string | null
          quantity: number
          quote_id: string
          tax_rate_snapshot?: number
          unit?: string
          unit_price: number
        }
        Update: {
          description_snapshot?: string
          discount_pct?: number
          id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          quote_id?: string
          tax_rate_snapshot?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_address_snapshot: string | null
          customer_id: string
          customer_name_snapshot: string
          global_discount_pct: number
          id: string
          notes: string | null
          number: string
          organization_id: string
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_address_snapshot?: string | null
          customer_id: string
          customer_name_snapshot: string
          global_discount_pct?: number
          id?: string
          notes?: string | null
          number: string
          organization_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_address_snapshot?: string | null
          customer_id?: string
          customer_name_snapshot?: string
          global_discount_pct?: number
          id?: string
          notes?: string | null
          number?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          organization_id: string
          product_id: string
          purchase_order_id: string | null
          quantity: number
          reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          organization_id: string
          product_id: string
          purchase_order_id?: string | null
          quantity: number
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          organization_id?: string
          product_id?: string
          purchase_order_id?: string | null
          quantity?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          archived_at: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
        }
        Insert: {
          archived_at?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
        }
        Update: {
          archived_at?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          id: string
          is_default: boolean
          name: string
          organization_id: string
          rate: number
        }
        Insert: {
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          rate: number
        }
        Update: {
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: {
          p_idempotency_key: string
          p_product_id: string
          p_quantity: number
          p_reason: string
        }
        Returns: string
      }
      assign_order_sales_rep: {
        Args: { p_order_id: string; p_sales_rep_id?: string }
        Returns: string
      }
      convert_quote_to_order: { Args: { p_quote_id: string }; Returns: string }
      create_order: {
        Args: { p_customer_id: string; p_lines: Json; p_notes: string }
        Returns: string
      }
      create_purchase_order: {
        Args: { p_lines: Json; p_notes: string; p_supplier_id: string }
        Returns: string
      }
      create_quote: {
        Args: {
          p_customer_id: string
          p_global_discount_pct: number
          p_lines: Json
          p_notes: string
        }
        Returns: string
      }
      duplicate_order: { Args: { p_order_id: string }; Returns: string }
      import_tariff_items: {
        Args: { p_items: Json; p_organization_id: string }
        Returns: number
      }
      next_document_number: {
        Args: { target_org: string; target_type: string }
        Returns: string
      }
      receive_purchase_order: {
        Args: {
          p_idempotency_key: string
          p_lines: Json
          p_purchase_order_id: string
        }
        Returns: string
      }
      set_order_status: {
        Args: {
          p_order_id: string
          p_reason?: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: string
      }
      set_quote_status: {
        Args: {
          p_quote_id: string
          p_status: Database["public"]["Enums"]["quote_status"]
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "administrator"
        | "administrative"
        | "production"
        | "cutter"
        | "cnc_operator"
      order_status: "pending" | "in_manufacturing" | "ready" | "delivered"
      purchase_status:
        | "draft"
        | "requested"
        | "partially_received"
        | "received"
        | "cancelled"
      quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired"
        | "converted"
      stock_movement_type: "entry" | "exit" | "purchase_receipt" | "adjustment"
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
      app_role: [
        "administrator",
        "administrative",
        "production",
        "cutter",
        "cnc_operator",
      ],
      order_status: ["pending", "in_manufacturing", "ready", "delivered"],
      purchase_status: [
        "draft",
        "requested",
        "partially_received",
        "received",
        "cancelled",
      ],
      quote_status: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "converted",
      ],
      stock_movement_type: ["entry", "exit", "purchase_receipt", "adjustment"],
    },
  },
} as const

