import {
  Webhook,
  Timer,
  Server,
  Code2,
  ArrowRightLeft,
  Spline,
  Combine,
  Hourglass,
  Database,
  type LucideIcon,
  CircleDot,
  Zap,
  Bot,
  KeyRound,
  Table,
  FlaskConical,
  BookText,
  BoxSelect
} from "lucide-react";
import type { NodeTypeId } from "./types";

export const NODE_TYPE_ICONS: Record<NodeTypeId, LucideIcon> = {
  webhook: Webhook,
  cron: Timer,
  httpRequest: Server,
  code: Code2,
  setTransform: ArrowRightLeft,
  ifSwitch: Spline,
  merge: Combine,
  delayWait: Hourglass,
  dataStore: Database,
};

export const NODE_GROUP_ICONS: Record<string, LucideIcon> = {
    Triggers: Zap,
    Logic: Spline,
    Actions: CircleDot,
    AI: Bot,
    Data: Database,
    Other: Combine,
    Credentials: KeyRound,
    Tables: Table,
    'Node Labs': FlaskConical,
    Layout: BookText,
}
