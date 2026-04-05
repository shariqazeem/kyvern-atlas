// Agent identifier — clean monospace display like Stripe/Etherscan
// No gradients, no emojis. Just a subtle gray circle with hex chars.

interface AgentAvatarProps {
  address: string;
  size?: number;
}

export function AgentAvatar({ address, size = 22 }: AgentAvatarProps) {
  const chars = address.slice(2, 4).toUpperCase();

  return (
    <div
      className="rounded bg-slate-100 flex items-center justify-center shrink-0 font-mono font-medium text-slate-500"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        lineHeight: 1,
      }}
    >
      {chars}
    </div>
  );
}
