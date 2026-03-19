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
      entregas: {
        Row: {
          cantidad: number
          created_at: string
          fecha_entrega: string
          id: string
          paciente_id: string
          tipo_entrega: Database["public"]["Enums"]["tipo_entrega"]
          unidad: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          fecha_entrega?: string
          id?: string
          paciente_id: string
          tipo_entrega: Database["public"]["Enums"]["tipo_entrega"]
          unidad?: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          fecha_entrega?: string
          id?: string
          paciente_id?: string
          tipo_entrega?: Database["public"]["Enums"]["tipo_entrega"]
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      genetics: {
        Row: {
          chemotypeCode: string
          created_at: string
          cbdRange: string | null
          description: string | null
          id: string
          name: string
          thcRange: string | null
          updated_at: string
        }
        Insert: {
          chemotypeCode: string
          created_at?: string
          cbdRange?: string | null
          description?: string | null
          id: string
          name: string
          thcRange?: string | null
          updated_at?: string
        }
        Update: {
          chemotypeCode?: string
          created_at?: string
          cbdRange?: string | null
          description?: string | null
          id?: string
          name?: string
          thcRange?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      installations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          state: Database["public"]["Enums"]["plant_state"] | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          name: string
          state?: Database["public"]["Enums"]["plant_state"] | null
          warehouse_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          state?: Database["public"]["Enums"]["plant_state"] | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          created_at: string
          dni: string
          email: string | null
          id: string
          localidad: string | null
          nombre_apellido: string
          numero_tramite_reprocann: string | null
          telefono: string | null
        }
        Insert: {
          created_at?: string
          dni: string
          email?: string | null
          id?: string
          localidad?: string | null
          nombre_apellido: string
          numero_tramite_reprocann?: string | null
          telefono?: string | null
        }
        Update: {
          created_at?: string
          dni?: string
          email?: string | null
          id?: string
          localidad?: string | null
          nombre_apellido?: string
          numero_tramite_reprocann?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      plants: {
        Row: {
          chemotypeCode: string
          created_at: string
          geneticId: string | null
          id: string
          installationId: string
          lotNumber: string
          name: string
          notes: string | null
          plantingDate: string
          predecessorId: string | null
          serialNumber: string
          state: string
          updated_at: string
          warehouseId: string
        }
        Insert: {
          chemotypeCode: string
          created_at?: string
          geneticId?: string | null
          id: string
          installationId: string
          lotNumber: string
          name: string
          notes?: string | null
          plantingDate?: string
          predecessorId?: string | null
          serialNumber: string
          state: string
          updated_at?: string
          warehouseId: string
        }
        Update: {
          chemotypeCode?: string
          created_at?: string
          geneticId?: string | null
          id?: string
          installationId?: string
          lotNumber?: string
          name?: string
          notes?: string | null
          plantingDate?: string
          predecessorId?: string | null
          serialNumber?: string
          state?: string
          updated_at?: string
          warehouseId?: string
        }
        Relationships: [
          {
            foreignKeyName: "plants_installationId_fkey"
            columns: ["installationId"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plants_warehouseId_fkey"
            columns: ["warehouseId"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string
          id: string
          installation_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          installation_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          installation_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["cultivation_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          name: string
          type?: Database["public"]["Enums"]["cultivation_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["cultivation_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      cultivation_type: "indoor" | "outdoor" | "invernadero"
      plant_state: "madre" | "esqueje" | "vegetativo" | "floracion"
      task_priority: "baja" | "media" | "alta"
      task_status: "pendiente" | "en_progreso" | "completada" | "cancelada"
      tipo_entrega: "materia_vegetal" | "plantas"
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
      cultivation_type: ["indoor", "outdoor", "invernadero"],
      plant_state: ["madre", "esqueje", "vegetativo", "floracion"],
      task_priority: ["baja", "media", "alta"],
      task_status: ["pendiente", "en_progreso", "completada", "cancelada"],
      tipo_entrega: ["materia_vegetal", "plantas"],
    },
  },
} as const
