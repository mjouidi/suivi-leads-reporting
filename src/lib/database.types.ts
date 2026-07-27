/**
 * Types manuels correspondant au schéma de la base "Suivi Leads" (voir
 * supabase/migrations/ dans le projet Suivi Leads Project). Cette app est en
 * lecture seule sur la plupart des tables (seules les colonnes utilisées par
 * les rapports sont typées) — exception : `profiles.remark`, éditable ici.
 */
import type { TaskKey } from '@/lib/tasks';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          role: 'employee' | 'admin';
          gender: 'f' | 'm';
          remark: string;
          created_at: string;
        };
        Insert: never;
        Update: { remark?: string };
        Relationships: [];
      };
      daily_entries: {
        Row: {
          id: string;
          person_id: string;
          date: string;
          calls_count: number;
          last_activity: string;
          clinic_accumulated: number;
          pause_accumulated: number;
          idle_accumulated: number;
          day_closed: boolean;
          closing_accumulated: number;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      task_entries: {
        Row: {
          id: string;
          daily_entry_id: string;
          person_id: string;
          date: string;
          task_key: TaskKey;
          accumulated: number;
          done: boolean;
          count: number | null;
          marked_done: boolean;
          explication_par_msg: number | null;
          explication_par_appel: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type DailyEntry = Database['public']['Tables']['daily_entries']['Row'];
export type TaskEntry = Database['public']['Tables']['task_entries']['Row'];
