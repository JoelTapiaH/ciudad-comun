export type Ink = "pink" | "blue" | "yellow" | "green";

export type Profile = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  city_name: string;
  invite_code: string;
  created_by: string;
  coins: number;
  xp: number;
  threat: number;
  last_settled_on: string;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
};

export type Habit = {
  id: string;
  group_id: string;
  user_id: string;
  name: string;
  emoji: string;
  ink: Ink;
  archived: boolean;
  created_at: string;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  group_id: string;
  user_id: string;
  log_date: string;
  streak: number;
  coins_awarded: number;
  xp_awarded: number;
  created_at: string;
};

export type Building = {
  id: string;
  name: string;
  cost: number;
  min_level: number;
  ink: Ink;
  category: string;
  reward_only: boolean;
  defense: number;
};

export type CityTile = {
  group_id: string;
  x: number;
  y: number;
  building_id: string;
  placed_by: string | null;
  integrity: number;
  created_at: string;
};

export type Challenge = {
  id: string;
  group_id: string;
  title: string;
  goal: number;
  starts_on: string;
  ends_on: string;
  reward_coins: number;
  reward_building_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
};

export type Raid = {
  id: string;
  group_id: string;
  happened_on: string;
  raider: string;
  power: number;
  defense: number;
  repelled: boolean;
  buildings_hit: number;
  created_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      groups: Table<Group>;
      group_members: Table<GroupMember>;
      habits: Table<
        Habit,
        Pick<Habit, "group_id" | "user_id" | "name"> & Partial<Habit>
      >;
      habit_logs: Table<
        HabitLog,
        Pick<HabitLog, "habit_id" | "user_id" | "log_date"> & Partial<HabitLog>
      >;
      buildings: Table<Building>;
      raids: Table<Raid>;
      city_tiles: Table<CityTile>;
      challenges: Table<
        Challenge,
        Pick<Challenge, "group_id" | "title" | "goal" | "starts_on" | "ends_on"> &
          Partial<Challenge>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_group: { Args: { p_name: string; p_city_name: string }; Returns: string };
      join_group: { Args: { p_code: string }; Returns: string };
      place_building: {
        Args: { p_group: string; p_x: number; p_y: number; p_building: string };
        Returns: undefined;
      };
      demolish_building: {
        Args: { p_group: string; p_x: number; p_y: number };
        Returns: undefined;
      };
      claim_challenge: { Args: { p_challenge: string }; Returns: undefined };
      city_level: { Args: { p_xp: number }; Returns: number };
      settle_city: { Args: { p_group: string }; Returns: number };
      city_defense: { Args: { p_group: string; p_on?: string | null }; Returns: number };
      repair_building: {
        Args: { p_group: string; p_x: number; p_y: number };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/* Formas compuestas que usan las pantallas ------------------------------- */

export type HabitWithToday = Habit & {
  owner: Profile;
  doneToday: boolean;
  logId: string | null;
  streak: number;
};

export type FeedEntry = {
  id: string;
  created_at: string;
  coins_awarded: number;
  streak: number;
  habitName: string;
  habitEmoji: string;
  personName: string;
  personEmoji: string;
  isMe: boolean;
};
