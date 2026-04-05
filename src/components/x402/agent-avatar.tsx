// Agent Avatar — deterministic colored circle from wallet address
// Same address always gets the same color

interface AgentAvatarProps {
  address: string;
  size?: number;
}

function hashToColor(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 65%, 55%)`;
}

function hashToGradient(address: string): [string, string] {
  const h1 = hashToColor(address);
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 6) - hash);
  }
  const h2Deg = Math.abs(hash % 360);
  const h2 = `hsl(${h2Deg}, 55%, 65%)`;
  return [h1, h2];
}

export function AgentAvatar({ address, size = 24 }: AgentAvatarProps) {
  const [c1, c2] = hashToGradient(address);
  const initials = address.slice(2, 4).toUpperCase();

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
    >
      <span
        className="text-white font-bold leading-none"
        style={{ fontSize: size * 0.38 }}
      >
        {initials}
      </span>
    </div>
  );
}
