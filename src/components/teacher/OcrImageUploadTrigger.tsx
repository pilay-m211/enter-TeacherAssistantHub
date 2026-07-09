import { useRef, useState } from "react";
import { ScanLine, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface OcrImageUploadTriggerProps extends Omit<ButtonProps, "onClick"> {
  label: string;
  isScanning: boolean;
  onFileSelected: (file: File) => void | Promise<void>;
}

export function OcrImageUploadTrigger({
  label,
  isScanning,
  onFileSelected,
  variant = "glass",
  size = "sm",
  className,
  ...props
}: OcrImageUploadTriggerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setTick] = useState(0);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onFileSelected(file);
    } catch (err) {
      toast({
        title: "Scan failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      // allow re-selecting the same file again
      e.target.value = "";
      setTick((t) => t + 1);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={isScanning}
        onClick={() => inputRef.current?.click()}
        {...props}
      >
        {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        {label}
      </Button>
    </>
  );
}
