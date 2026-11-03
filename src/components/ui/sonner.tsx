import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      richColors
      position="top-right"
      toastOptions={{
        style: {
          borderRadius: "10px",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
