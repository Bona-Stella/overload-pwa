import type { CatalogBrowseExercise, CatalogGroup, CatalogMuscle } from '../features/workout-online/catalog-browse.ts'

type SampleMuscle = [groupCode: Exclude<CatalogGroup, 'CARDIO' | 'OTHER'>, name: string]
type Sample = Omit<CatalogBrowseExercise, 'id' | 'muscles' | 'recordMethod' | 'exerciseType' | 'equipmentDescription' | 'instructionsKo'> & {
  id?: string
  exerciseType?: CatalogBrowseExercise['exerciseType']
  equipmentDescription?: string | null
  muscles?: CatalogMuscle[]
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
  {
    // Review copy of overload-server/docs/dev-data/overload-31-catalog/catalog.json.
    // This approved-catalog UUID is distinct from the earlier V17 example exercise.
    id: '2d04629b-b651-811b-8e66-3d56102988a8',
    name: '머신 하이 로우',
    aliases: ['하이 로우', '하이로우', 'Hammer Strength High Row', 'Iso-Lateral High Row', '가슴 지지 하이 로우'],
    pplSplit: 'PULL', frontBackSplit: 'BACK',
    muscles: [
      { id: 'd3200000-0000-4000-8000-000000000006', groupCode: 'BACK', name: '능형근', role: 'PRIMARY' },
      { id: 'd3200000-0000-4000-8000-000000000008', groupCode: 'BACK', name: '중부승모근', role: 'PRIMARY' },
      { id: 'd3200000-0000-4000-8000-000000000005', groupCode: 'BACK', name: '광배근', role: 'SECONDARY' },
      { id: 'd3200000-0000-4000-8000-000000000014', groupCode: 'SHOULDERS', name: '후면삼각근', role: 'SECONDARY' },
      { id: 'd3200000-0000-4000-8000-000000000020', groupCode: 'ARMS', name: '상완이두근', role: 'SECONDARY' },
    ],
    equipmentDescription: '원판형 머신. 가슴 패드와 허벅지 고정 패드, 경사진 오버핸드 손잡이를 사용합니다.',
    steps: [
      '좌석과 지지 패드를 조절하여 가슴과 허벅지를 안정적으로 고정합니다.',
      '약 30~45도 기울어진 오버핸드 계열 손잡이를 잡습니다.',
      '상체가 패드에서 과하게 떨어지지 않게 유지하면서 팔꿈치를 아래·뒤쪽으로 당깁니다.',
      '등 근육을 수축한 뒤 반동 없이 천천히 손잡이를 시작 위치로 되돌립니다.',
    ],
  },
  { name: '덤벨 컬', aliases: ['dumbbell curl', 'biceps curl'], primary: [['ARMS', '상완이두근']] },
  { name: '크런치', aliases: ['crunch'], primary: [['CORE', '복직근']] },
  { name: '걷기', aliases: ['walking', 'walk'], exerciseType: 'CARDIO' },
  { name: '손목 스트레칭', aliases: ['wrist stretch'], exerciseType: 'STRETCH' },
]

export const catalogSamples: CatalogBrowseExercise[] = samples.map(({
  id: standardId, exerciseType = 'WEIGHT', primary = [], secondary = [], steps,
  muscles: registeredMuscles, equipmentDescription = null, ...exercise
}, index) => {
  const id = standardId ?? `catalog-example-${index + 1}`
  const muscles = (entries: SampleMuscle[], role: CatalogMuscle['role']): CatalogMuscle[] =>
    entries.map(([groupCode, name], order) => ({ id: `${id}-${role}-${order}`, groupCode, name, role }))
  return {
    ...exercise, id, exerciseType, equipmentDescription,
    recordMethod: exerciseType === 'WEIGHT' ? 'SETS_REPS' : exerciseType === 'CARDIO' ? 'CARDIO' : 'UNSPECIFIED',
    instructionsKo: steps?.join('\n') ?? null,
    muscles: registeredMuscles ?? [...muscles(primary, 'PRIMARY'), ...muscles(secondary, 'SECONDARY')],
  }
})

export const catalogInstructionNotes: Readonly<Record<string, string>> = {
  '2d04629b-b651-811b-8e66-3d56102988a8': '31종 카탈로그 자료의 사용자 확인 기반 한국어 초안입니다. 개발 전용 시연용 사본이며 실제 상세 API 응답이 아닙니다.',
}
