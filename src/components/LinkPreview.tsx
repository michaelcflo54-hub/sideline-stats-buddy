import { Card } from '@/components/ui/card';

interface LinkPreviewProps {
  teamName: string;
  teamCode: string;
  className?: string;
}

const LinkPreview = ({ teamName, teamCode, className }: LinkPreviewProps) => {
  // Create initials from team name (similar to D & D)
  const getTeamInitials = (name: string) => {
    const words = name.split(' ').filter(word => word.length > 0);
    if (words.length >= 2) {
      return `${words[0][0]} & ${words[1][0]}`;
    }
    return words[0]?.slice(0, 3) || 'T';
  };

  const initials = getTeamInitials(teamName);

  return (
    <Card className={`w-32 h-32 bg-black border-0 flex flex-col items-center justify-center text-white ${className}`}>
      {/* Football Icon */}
      <div className="mb-2">
        <svg
          width="32"
          height="20"
          viewBox="0 0 32 20"
          fill="none"
          className="text-white"
        >
          {/* Football oval shape */}
          <ellipse
            cx="16"
            cy="10"
            rx="15"
            ry="9"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Inner oval */}
          <ellipse
            cx="16"
            cy="10"
            rx="12"
            ry="7"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
          {/* Stitching lines */}
          <line x1="16" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1"/>
          <line x1="20" y1="8" x2="20" y2="12" stroke="currentColor" strokeWidth="1"/>
          <line x1="8" y1="9" x2="8" y2="11" stroke="currentColor" strokeWidth="1"/>
          <line x1="24" y1="9" x2="24" y2="11" stroke="currentColor" strokeWidth="1"/>
        </svg>
      </div>
      
      {/* Team Initials */}
      <div className="text-white font-bold text-lg leading-none">
        {initials}
      </div>
      
      {/* Team Code */}
      <div className="text-white/70 text-xs mt-1 font-mono">
        {teamCode}
      </div>
    </Card>
  );
};

export default LinkPreview;