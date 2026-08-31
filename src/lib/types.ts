export interface Exercise {
  id: string
  name: string
  muscle: string
  imgUrl: string
  gifUrl?: string
  tips: string[]
  alternatives: { name: string; reason: string }[]
  dictId?: string
}

export interface ExerciseLogBlock {
  sets: number
  reps: number
  weight: number
}

export interface ExerciseLog {
  id: string
  exerciseId: string
  date: string
  weight: number
  units: string
  sets?: number
  reps?: string
  blocks?: ExerciseLogBlock[]
}

export interface ProgramExercise {
  exerciseId: string
  sets: number
  reps: string
  rest: number
}

export interface ProgramDay {
  name: string
  subtitle: string
  duration: number
  exercises: ProgramExercise[]
  weekday?: number // 1=Lunes … 7=Domingo; undefined = secuencial desde lunes
}

export interface ProgramWeek {
  name: string
  subtitle: string
  tag: string
  days: ProgramDay[]
}

export interface Program {
  id: string
  name: string
  weeks: ProgramWeek[]
  createdAt?: string
}

export interface GymSession {
  id: string
  date: string
  seconds: number
  weekStart: string
}

export interface Settings {
  id: string
  activeProgramId: string | null
  currentWeekIdx: number
  units: string
  accentColor: string
  hasWatch: boolean
  userName?: string
  height?: string
  weight?: string
  sex?: string
  age?: string
  goal?: string
  experience?: string
  occupation?: string
  pushSubscribed?: boolean
  pushServerUrl?: string
  sessionState?: { date: string; phase: number; todayExDone: number; startedAt?: number | null; endedAt?: number | null } | any
  lastCoachAnalysis?: any
  streakShownDate?: string
  rescheduleWeekOrder?: Record<string, number | number[]>
  todaySwaps?: { date: string; swaps: Record<string, string> } // originalExerciseId -> altExerciseId, valid only for `date`
  language?: string
  username?: string
  lastUpdate?: string
  fontScale?: number
  onboarded?: boolean
  onboardingStep?: number
  debugAI?: boolean
}

export interface BackupData {
  exercises?: Exercise[]
  exerciseLogs?: ExerciseLog[]
  programs?: Program[]
  settings?: Settings | null
}
