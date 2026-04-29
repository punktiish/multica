"use client";

import { ActorAvatar as ActorAvatarBase } from "@multica/ui/components/common/actor-avatar";
import { useActorName } from "@multica/core/workspace/hooks";

interface ActorAvatarProps {
  actorType: string;
  actorId: string;
  size?: number;
  className?: string;
  disableHoverCard?: boolean;
}

export function ActorAvatar({ actorType, actorId, size, className, disableHoverCard }: ActorAvatarProps) {
  const { getActorName, getActorInitials, getActorAvatarUrl } = useActorName();
  if (disableHoverCard || actorType !== "agent") {
    return (
      <ActorAvatarBase
        name={getActorName(actorType, actorId)}
        initials={getActorInitials(actorType, actorId)}
        avatarUrl={getActorAvatarUrl(actorType, actorId)}
        isAgent={actorType === "agent"}
        size={size}
        className={className}
      />
    );
  }
  return (
    <ActorAvatarBase
      name={getActorName(actorType, actorId)}
      initials={getActorInitials(actorType, actorId)}
      avatarUrl={getActorAvatarUrl(actorType, actorId)}
      isAgent={actorType === "agent"}
      size={size}
      className={className}
    />
  );
}
