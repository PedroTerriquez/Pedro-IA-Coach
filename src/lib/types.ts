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

export interface ExerciseLog {
  id: string
  exerciseId: string
  date: string
  weight: number
  units: string
  sets?: number
  reps?: string
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
  sessionState?: any
  lastCoachAnalysis?: any
  streakShownDate?: string
  rescheduleWeekOrder?: Record<string, number | number[]>
  language?: string
  username?: string
  lastUpdate?: string
  fontScale?: number
}

export interface BackupData {
  exercises?: Exercise[]
  exerciseLogs?: ExerciseLog[]
  programs?: Program[]
  settings?: Settings | null
}
