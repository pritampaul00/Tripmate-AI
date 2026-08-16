interface NavButtonProps {
  children: React.ReactNode;
}

export default function NavButton({
  children,
}: NavButtonProps) {
  return (
    <button className="...">
      {children}
    </button>
  );
}