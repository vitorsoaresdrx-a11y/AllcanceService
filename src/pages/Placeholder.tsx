interface PlaceholderProps {
  title: string;
}

export default function Placeholder({ title }: PlaceholderProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <p className="text-muted-foreground text-sm">Em breve</p>
    </div>
  );
}
