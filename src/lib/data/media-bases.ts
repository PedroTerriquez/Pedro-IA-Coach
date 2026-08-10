// Shared media CDN bases, isolated so the vite config (which imports
// media-file.ts) never depends on the exercise dictionary. Changing this file
// restarts the dev server by design; changing the dictionary must NOT.
export const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
export const EX_GIF_BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/';
