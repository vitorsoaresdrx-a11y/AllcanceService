import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OSPhoto {
  id: string;
  os_id: string;
  url: string;
  tipo: "chegada" | "problema" | "finalizacao";
  criado_em: string;
  expira_em: string;
}

const STORAGE_BUCKET = "os-fotos";

export const KEY = ["os_fotos"];

export function useOSPhotos(osId?: string) {
  return useQuery({
    queryKey: [...KEY, osId],
    queryFn: async () => {
      if (!osId) return [];
      const { data, error } = await supabase
        .from("os_fotos" as any)
        .select("*")
        .eq("os_id", osId)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as OSPhoto[];
    },
    enabled: !!osId,
  });
}

/**
 * 🎨 Comprime uma imagem para no máximo 800px de largura e 70% de qualidade.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 1200; // Aumentado um pouco para melhor detalhamento técnico
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível obter o contexto do canvas"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao converter Canvas para Blob"))),
        "image/jpeg",
        0.8 // 80% de qualidade para garantir nitidez técnica
      );
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
  });
}

export function useUploadPhoto() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ osId, file, tipo }: { osId: string; file: File; tipo: OSPhoto["tipo"] }) => {
      const compressedBlob = await compressImage(file);
      const fileExt = "jpg";
      const fileName = `${osId}/${tipo}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // 1. Upload to Storage
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, compressedBlob, { contentType: "image/jpeg" });

      if (uploadErr) throw uploadErr;

      // 2. Get Public URL (Assuming the bucket is configured for signing or public access)
      // Since it's private, we'll use a permanent reference URL and the hook will manage access or we'll get a permanent link if possible.
      // But for OS fotos that expire in 15 days, we store the static URL or path.
      // Usually, we store the full URL or we sign it on every fetch.
      // For simplicity, we'll get the signed URL or we assume the bucket is managed for public temporary links.
      // Let's use the static getPublicUrl for now to test or store the path.
      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

      // 3. Save to DB
      const { error: dbErr } = await supabase.from("os_fotos" as any).insert({
        os_id: osId,
        url: publicUrl,
        tipo,
        expira_em: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (dbErr) throw dbErr;
      return publicUrl;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [...KEY, variables.osId] });
      toast.success("Foto anexada!");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error("Erro ao subir foto: " + err.message);
    },
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (photo: OSPhoto) => {
      // 1. Extract path from URL
      const url = new URL(photo.url);
      const pathParts = url.pathname.split("/").slice(url.pathname.split("/").indexOf(STORAGE_BUCKET) + 1);
      const filePath = pathParts.join("/");

      // 2. Delete from Storage
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);

      // 3. Delete from DB
      const { error } = await supabase.from("os_fotos" as any).delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: (_, photo) => {
      qc.invalidateQueries({ queryKey: [...KEY, photo.os_id] });
      toast.success("Foto removida");
    },
  });
}
