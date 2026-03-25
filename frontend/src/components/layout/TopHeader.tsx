interface TopHeaderProps {
  title: string;
}

export default function TopHeader({ title }: TopHeaderProps) {
  return (
    <header className="top-header">
      <h1 className="top-header__title">{title}</h1>
    </header>
  );
}
