import type { CatalogBrowseExercise, CatalogGroup, CatalogMuscle } from '../features/workout-online/catalog-browse.ts'

type SampleMuscle = [groupCode: Exclude<CatalogGroup, 'CARDIO' | 'OTHER'>, name: string]
type Sample = Omit<CatalogBrowseExercise, 'id' | 'muscles' | 'recordMethod' | 'exerciseType' | 'equipmentDescription' | 'instructionsKo'> & {
  exerciseType?: CatalogBrowseExercise['exerciseType']
  primary?: SampleMuscle[]
  secondary?: SampleMuscle[]
  steps?: string[]
}

const samples: Sample[] = [
  {
    name: '바벨 벤치프레스', aliases: ['bench', 'barbell bench press', '바벨 벤치'],
    pplSplit: 'PUSH', frontBackSplit: 'FRONT', primary: [['CHEST', '대흉근']],
    secondary: [['SHOULDERS', '전면 삼각근'], ['ARMS', '상완삼두근']],
    steps: ['벤치에 누워 바벨을 안정적으로 잡습니다.', '바벨을 천천히 가슴 쪽으로 내립니다.', '호흡을 내쉬며 바벨을 위로 밀어 올립니다.'],
  },
  { name: '인클라인 덤벨 프레스', aliases: ['incline dumbbell press'], primary: [['CHEST', '상부 대흉근']] },
  { name: '덤벨 숄더 프레스', aliases: ['shoulder press', '덤벨 프레스'], primary: [['SHOULDERS', '전면 삼각근']] },
  {
    name: '랫 풀다운', aliases: ['lat pulldown', '랫풀다운'], pplSplit: 'PULL', frontBackSplit: 'BACK',
    primary: [['BACK', '광배근'], ['BACK', '대원근']],
    secondary: [['ARMS', '상완이두근'], ['BACK', '능형근']],
    steps: ['기구에 앉아 허벅지 패드를 체형에 맞게 조절합니다.', '바를 잡고 가슴 방향으로 천천히 당깁니다.', '팔을 천천히 펴면서 시작 자세로 돌아옵니다.'],
  },
  {
    name: '체스트 서포티드 와이드 그립 시티드 케이블 로우',
    aliases: ['시티드 케이블 로우', '가슴 지지 와이드 로우', 'wide grip cable row', 'chest supported seated cable row', 'wide row'],
    primary: [['BACK', '능형근'], ['SHOULDERS', '후면 삼각근']],
  },
  {
    name: '바벨 스쿼트', aliases: ['barbell squat', '스쿼트'], pplSplit: 'LEGS', frontBackSplit: 'FRONT',
    primary: [['LEGS', '대퇴사두근'], ['LEGS', '대둔근']], secondary: [['LEGS', '햄스트링']],
    steps: ['발을 어깨너비로 두고 바벨을 안정적으로 지지합니다.', '무릎과 엉덩이를 굽혀 천천히 내려갑니다.', '발바닥으로 바닥을 밀며 일어납니다.'],
  },
  { name: '레그 컬', aliases: ['leg curl'], primary: [['LEGS', '햄스트링']] },
  { name: '하이로우', aliases: ['high row', '하이 로우'], primary: [['BACK', '광배근']] },
  { name: '덤벨 컬', aliases: ['dumbbell curl', 'biceps curl'], primary: [['ARMS', '상완이두근']] },
  { name: '크런치', aliases: ['crunch'], primary: [['CORE', '복직근']] },
  { name: '걷기', aliases: ['walking', 'walk'], exerciseType: 'CARDIO' },
  { name: '손목 스트레칭', aliases: ['wrist stretch'], exerciseType: 'STRETCH' },
]

export const catalogSamples: CatalogBrowseExercise[] = samples.map(({
  exerciseType = 'WEIGHT', primary = [], secondary = [], steps, ...exercise
}, index) => {
  const id = `catalog-example-${index + 1}`
  const muscles = (entries: SampleMuscle[], role: CatalogMuscle['role']): CatalogMuscle[] =>
    entries.map(([groupCode, name], order) => ({ id: `${id}-${role}-${order}`, groupCode, name, role }))
  return {
    ...exercise, id, exerciseType, equipmentDescription: null,
    recordMethod: exerciseType === 'WEIGHT' ? 'SETS_REPS' : exerciseType === 'CARDIO' ? 'CARDIO' : 'UNSPECIFIED',
    instructionsKo: steps?.join('\n') ?? null,
    muscles: [...muscles(primary, 'PRIMARY'), ...muscles(secondary, 'SECONDARY')],
  }
})
