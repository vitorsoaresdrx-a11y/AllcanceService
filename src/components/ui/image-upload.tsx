import { useState, useRef, useCallback } from "react";
import { ImagePlus, X, Loader2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/compress-image";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder: string;
  maxImages?: number;
}

export function ImageUpload({ images, onChange, folder, maxImages = 2 }: ImageUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast({
        title: "Faça login para enviar imagens",
        description: "O upload de imagens exige um usuário autenticado.",
        variant: "destructive",
      });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast({ title: `Máximo de ${maxImages} imagens`, variant: "destructive" });
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    try {
      const newUrls: string[] = [];

      for (const file of toUpload) {
        if (!file.type.startsWith("image/")) {
          toast({ title: "Arquivo inválido, envie uma imagem", variant: "destructive" });
          continue;
        }

        setCompressing(true);
        const compressed = await compressImage(file, 'product');
        setCompressing(false);
        const fileName = `${folder}/${crypto.randomUUID()}.webp`;

        const { error } = await supabase.storage
          .from("product-images")
          .upload(fileName, compressed, {
            contentType: "image/webp",
            upsert: false,
          });

        if (error) throw error;

        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        newUrls.push(data.publicUrl);
      }

      onChange([...images, ...newUrls]);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message.toLowerCase() : "";
      const isRlsError = errorMessage.includes("row-level security");

      toast({
        title: isRlsError ? "Upload bloqueado" : "Erro ao enviar imagem",
        description: isRlsError
          ? "Você precisa estar logado na aplicação para enviar imagens."
          : undefined,
        variant: "destructive",
      });
    } finally {
      setCompressing(false);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = async (url: string) => {
    const match = url.match(/product-images\/(.+)$/);
    if (match) {
      await supabase.storage.from("product-images").remove([match[1]]);
    }
    onChange(images.filter((u) => u !== url));
  };

  // Drag & drop reorder
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) {
        setDragIndex(null);
        setOverIndex(null);
        return;
      }
      const reordered = [...images];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      onChange(reordered);
      setDragIndex(null);
      setOverIndex(null);
    },
    [dragIndex, images, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {images.map((url, index) => (
          <div
            key={url}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`relative h-20 w-20 rounded-md border overflow-hidden bg-muted/20 group cursor-grab active:cursor-grabbing transition-all ${
              dragIndex === index
                ? "opacity-40 scale-95 border-primary"
                : overIndex === index && dragIndex !== null
                ? "border-primary ring-2 ring-primary/30"
                : "border-border"
            }`}
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            {/* Drag handle indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-black/40 to-transparent flex items-end justify-center pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-3 w-3 text-white/80" />
            </div>
            {/* Position badge */}
            <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background/80 text-[9px] font-medium flex items-center justify-center text-foreground">
              {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeImage(url)}
              className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || compressing}
            className="h-20 w-20 rounded-md border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors"
          >
            {uploading || compressing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-[8px] mt-0.5">{compressing ? "Otimizando..." : "Enviando..."}</span>
              </div>
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span className="text-[9px] mt-0.5">Imagem</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="text-[10px] text-muted-foreground">
        Até {maxImages} imagens • JPG, PNG ou WebP • Arraste para reordenar
      </p>
    </div>
  );
}
