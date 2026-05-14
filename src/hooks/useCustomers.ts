import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Customer {
  id: string;
  name: string;
  whatsapp: string | null;
  cpf: string | null;
  cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const CUSTOMERS_KEY = ["customers"];

export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, whatsapp, cpf, cep, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, notes, created_at, updated_at")
        .order("name");
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer: {
      name: string;
      whatsapp?: string | null;
      cpf?: string | null;
      cep?: string | null;
      address_street?: string | null;
      address_number?: string | null;
      address_complement?: string | null;
      address_neighborhood?: string | null;
      address_city?: string | null;
      address_state?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("customers")
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      whatsapp?: string | null;
      cpf?: string | null;
      cep?: string | null;
      address_street?: string | null;
      address_number?: string | null;
      address_complement?: string | null;
      address_neighborhood?: string | null;
      address_city?: string | null;
      address_state?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  });
}

export function useCustomerWithSales(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer_sales", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomerServiceOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer_service_orders", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomerMechanicJobs(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer_mechanic_jobs", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mechanic_jobs" as any)
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomerQuotes(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer_quotes", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, quote_items(*)")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
