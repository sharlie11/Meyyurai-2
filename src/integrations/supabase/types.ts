export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          phone_number: string | null;
          created_at: string;
          last_active_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          phone_number?: string | null;
          created_at?: string;
          last_active_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone_number?: string | null;
          created_at?: string;
          last_active_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone_number: string | null;
          emergency_contact: string | null;
          guardian_contact: string | null;
          country: string;
          state: string | null;
          city: string | null;
          avatar_url: string | null;
          profile_photo: string | null;
          role: string;
          preferred_language: string;
          language: string;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          phone_number?: string | null;
          emergency_contact?: string | null;
          guardian_contact?: string | null;
          country?: string;
          state?: string | null;
          city?: string | null;
          avatar_url?: string | null;
          profile_photo?: string | null;
          role?: string;
          preferred_language?: string;
          language?: string;
          onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          phone_number?: string | null;
          emergency_contact?: string | null;
          guardian_contact?: string | null;
          country?: string;
          state?: string | null;
          city?: string | null;
          avatar_url?: string | null;
          profile_photo?: string | null;
          role?: string;
          preferred_language?: string;
          language?: string;
          onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      emergency_contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          relationship: string | null;
          phone: string;
          alternate_phone: string | null;
          email: string | null;
          priority_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          relationship?: string | null;
          phone: string;
          alternate_phone?: string | null;
          email?: string | null;
          priority_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          relationship?: string | null;
          phone?: string;
          alternate_phone?: string | null;
          email?: string | null;
          priority_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      trusted_contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          email: string | null;
          status: string;
          priority_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone: string;
          email?: string | null;
          status?: string;
          priority_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          status?: string;
          priority_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      emergency_events: {
        Row: {
          id: string;
          user_id: string;
          time: string;
          latitude: number | null;
          longitude: number | null;
          accuracy: number | null;
          device_info: Json;
          emergency_type: string;
          notes: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          time?: string;
          latitude?: number | null;
          longitude?: number | null;
          accuracy?: number | null;
          device_info?: Json;
          emergency_type?: string;
          notes?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          time?: string;
          latitude?: number | null;
          longitude?: number | null;
          accuracy?: number | null;
          device_info?: Json;
          emergency_type?: string;
          notes?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      emergency_logs: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          details: Json | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          details?: Json | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          details?: Json | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      location_tracking: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          accuracy: number | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          accuracy?: number | null;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          latitude?: number;
          longitude?: number;
          accuracy?: number | null;
          timestamp?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          user_question: string;
          ai_response: string;
          language: string;
          urgency_detected: boolean;
          urgency_level: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          user_question: string;
          ai_response: string;
          language?: string;
          urgency_detected?: boolean;
          urgency_level?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string;
          user_question?: string;
          ai_response?: string;
          language?: string;
          urgency_detected?: boolean;
          urgency_level?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_chat_history: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          role: string;
          content: string;
          language: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          role: string;
          content: string;
          language?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          language?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          status: string | null;
          internal_case_summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          status?: string | null;
          internal_case_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          status?: string | null;
          internal_case_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_messages: {
        Row: {
          id: string;
          session_id: string;
          role: string;
          content: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: string;
          content: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: string;
          content?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      retrieval_logs: {
        Row: {
          id: string;
          session_id: string | null;
          user_query: string;
          search_type: string;
          results_returned: number | null;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_query: string;
          search_type: string;
          results_returned?: number | null;
          latency_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_query?: string;
          search_type?: string;
          results_returned?: number | null;
          latency_ms?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_feedback: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          is_helpful: boolean;
          comments: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          is_helpful: boolean;
          comments?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          is_helpful?: boolean;
          comments?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      knowledge_sources: {
        Row: {
          id: string;
          name: string;
          type: string;
          base_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          base_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          base_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      legal_documents: {
        Row: {
          id: string;
          source_id: string | null;
          title: string;
          act_name: string | null;
          enactment_year: number | null;
          ministry: string | null;
          document_type: string;
          version: string | null;
          official_url: string | null;
          last_updated_by_source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source_id?: string | null;
          title: string;
          act_name?: string | null;
          enactment_year?: number | null;
          ministry?: string | null;
          document_type: string;
          version?: string | null;
          official_url?: string | null;
          last_updated_by_source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string | null;
          title?: string;
          act_name?: string | null;
          enactment_year?: number | null;
          ministry?: string | null;
          document_type?: string;
          version?: string | null;
          official_url?: string | null;
          last_updated_by_source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      legal_chunks: {
        Row: {
          id: string;
          document_id: string;
          chapter_number: string | null;
          chapter_title: string | null;
          section_number: string | null;
          subsection: string | null;
          official_text: string;
          plain_language_summary: string | null;
          token_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          chapter_number?: string | null;
          chapter_title?: string | null;
          section_number?: string | null;
          subsection?: string | null;
          official_text: string;
          plain_language_summary?: string | null;
          token_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          chapter_number?: string | null;
          chapter_title?: string | null;
          section_number?: string | null;
          subsection?: string | null;
          official_text?: string;
          plain_language_summary?: string | null;
          token_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      voice_notes: {
        Row: {
          id: string;
          user_id: string;
          audio_url: string;
          storage_path: string | null;
          transcript: string | null;
          language: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          audio_url: string;
          storage_path?: string | null;
          transcript?: string | null;
          language?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          audio_url?: string;
          storage_path?: string | null;
          transcript?: string | null;
          language?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      uploaded_files: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_path: string;
          file_type: string;
          file_size: number;
          analysis_result: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_path: string;
          file_type: string;
          file_size: number;
          analysis_result?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_path?: string;
          file_type?: string;
          file_size?: number;
          analysis_result?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      rights_categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          icon: string | null;
          description: string | null;
          priority_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          icon?: string | null;
          description?: string | null;
          priority_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          icon?: string | null;
          description?: string | null;
          priority_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      rights_articles: {
        Row: {
          id: string;
          category_id: string;
          title: string;
          description: string | null;
          procedures: Json;
          contact_resources: Json;
          emergency_numbers: Json;
          source_url: string | null;
          last_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          title: string;
          description?: string | null;
          procedures?: Json;
          contact_resources?: Json;
          emergency_numbers?: Json;
          source_url?: string | null;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          title?: string;
          description?: string | null;
          procedures?: Json;
          contact_resources?: Json;
          emergency_numbers?: Json;
          source_url?: string | null;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      resources_directory: {
        Row: {
          id: string;
          name: string;
          category: string;
          address: string | null;
          contact_number: string | null;
          website: string | null;
          latitude: number | null;
          longitude: number | null;
          operating_hours: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          address?: string | null;
          contact_number?: string | null;
          website?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          operating_hours?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          address?: string | null;
          contact_number?: string | null;
          website?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          operating_hours?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          type: string;
          status: string;
          delivery_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message: string;
          type?: string;
          status?: string;
          delivery_time?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message?: string;
          type?: string;
          status?: string;
          delivery_time?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          device_info: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          device_info?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          device_info?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          dark_mode: boolean;
          location_sharing_enabled: boolean;
          notifications_enabled: boolean;
          voice_input_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          dark_mode?: boolean;
          location_sharing_enabled?: boolean;
          notifications_enabled?: boolean;
          voice_input_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          dark_mode?: boolean;
          location_sharing_enabled?: boolean;
          notifications_enabled?: boolean;
          voice_input_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          sources: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          sources?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          sources?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          law_id: string | null;
          section_id: string | null;
          title: string;
          category: string;
          source_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          law_id?: string | null;
          section_id?: string | null;
          title: string;
          category?: string;
          source_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          law_id?: string | null;
          section_id?: string | null;
          title?: string;
          category?: string;
          source_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      complaints: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: string;
          complainant_name: string | null;
          incident_date: string | null;
          location: string | null;
          respondent: string | null;
          incident_description: string;
          requested_action: string | null;
          contact_details: string | null;
          complaint_text: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          category?: string;
          complainant_name?: string | null;
          incident_date?: string | null;
          location?: string | null;
          respondent?: string | null;
          incident_description: string;
          requested_action?: string | null;
          contact_details?: string | null;
          complaint_text: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          category?: string;
          complainant_name?: string | null;
          incident_date?: string | null;
          location?: string | null;
          respondent?: string | null;
          incident_description?: string;
          requested_action?: string | null;
          contact_details?: string | null;
          complaint_text?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      evidence: {
        Row: {
          id: string;
          user_id: string;
          complaint_id: string | null;
          file_name: string;
          file_type: string;
          file_url: string;
          file_size: number;
          description: string | null;
          extracted_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          complaint_id?: string | null;
          file_name: string;
          file_type: string;
          file_url: string;
          file_size?: number;
          description?: string | null;
          extracted_text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          complaint_id?: string | null;
          file_name?: string;
          file_type?: string;
          file_url?: string;
          file_size?: number;
          description?: string | null;
          extracted_text?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_logs: {
        Row: {
          id: string;
          user_id: string | null;
          conversation_id: string | null;
          query: string;
          provider: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          conversation_id?: string | null;
          query: string;
          provider?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          conversation_id?: string | null;
          query?: string;
          provider?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      encrypt_field: {
        Args: { plaintext: string; key_str: string };
        Returns: string;
      };
      decrypt_field: {
        Args: { ciphertext: string; key_str: string };
        Returns: string;
      };
      is_admin: {
        Args: { user_uuid: string };
        Returns: boolean;
      };
      select_emergency_contacts: {
        Args: { p_key: string };
        Returns: {
          id: string;
          user_id: string;
          name: string;
          relationship: string | null;
          phone: string | null;
          alternate_phone: string | null;
          email: string | null;
          priority_order: number;
          is_primary: boolean;
          created_at: string;
        }[];
      };
      select_trusted_contacts: {
        Args: { p_key: string };
        Returns: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          status: string;
          priority_order: number;
          created_at: string;
        }[];
      };
      insert_emergency_contact: {
        Args: {
          p_name: string;
          p_relationship?: string | null;
          p_phone: string;
          p_alternate_phone?: string | null;
          p_email?: string | null;
          p_priority_order?: number;
          p_is_primary?: boolean;
          p_key: string;
        };
        Returns: string;
      };
      insert_trusted_contact: {
        Args: {
          p_name: string;
          p_phone: string;
          p_email?: string | null;
          p_priority_order?: number;
          p_key: string;
        };
        Returns: string;
      };
      update_emergency_contact: {
        Args: {
          p_id: string;
          p_name?: string | null;
          p_relationship?: string | null;
          p_phone?: string | null;
          p_alternate_phone?: string | null;
          p_email?: string | null;
          p_priority_order?: number | null;
          p_is_primary?: boolean | null;
          p_key: string;
        };
        Returns: boolean;
      };
      update_trusted_contact: {
        Args: {
          p_id: string;
          p_name?: string | null;
          p_phone?: string | null;
          p_email?: string | null;
          p_status?: string | null;
          p_priority_order?: number | null;
          p_key: string;
        };
        Returns: boolean;
      };
      hybrid_search_legal_chunks: {
        Args: {
          query_text: string;
          query_embedding: number[] | string;
          match_count?: number;
          full_text_weight?: number;
          semantic_weight?: number;
          rrf_k?: number;
        };
        Returns: {
          chunk_id: string;
          document_id: string;
          act_name: string;
          official_url: string;
          chapter_number: string;
          chapter_title: string;
          section_number: string;
          subsection: string;
          official_text: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      user_role: "user" | "admin";
      sender_type: "user" | "ai" | "system";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      user_role: ["user", "admin"],
      sender_type: ["user", "ai", "system"],
    },
  },
} as const;
