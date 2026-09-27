# [개발 계획서] 홈 서버랙 통합 모니터링 및 4채널 스마트 팬 컨트롤러

## 1. 프로젝트 개요 (Project Overview)
본 프로젝트는 **Raspberry Pi 5**를 메인 컨트롤러로 사용하여 홈 서버랙 내부의 다중 노드( 총 6대: Windows x86 1대, Proxmox x86 1대, Orange Pi 2대, Raspberry Pi 2대)의 시스템 자원 및 온도를 네트워크로 수집하고, 라즈베리파이 5의 GPIO에 연결된 DS18B20 온도 센서와 4채널 PWM 팬을 제어하는 통합 웹 대시보드 및 에이전트 시스템을 구축하는 것이다.

---

## 2. 기술 스택 및 핵심 제약사항 (Tech Stack & Constraints)
1. **메인 서버 (Raspberry Pi 5)**
   - **언어/프레임워크**: Python 3.11+, FastAPI, Uvicorn, Pydantic
   - **GPIO 제어**: `gpiozero` + `lgpio` (`LGPIOFactory`) 필수 사용
     - *주의*: 라즈베리파이 5는 RP1 I/O 칩셋을 사용하므로 구형 `RPi.GPIO`는 동작하지 않음.
     - **Mock 모드 지원 필수**: 라즈베리파이 5가 아닌 일반 PC(Windows/macOS)나 가상 환경에서 개발 및 테스트할 때 에러 없이 실행되도록 GPIO 및 1-Wire 센서 모듈에 **Mock(가상 시뮬레이션) Fallback 로직**을 반드시 구현할 것.
   - **프론트엔드**: HTML5, Tailwind CSS (CDN), Vanilla JavaScript (Fetch API 기반 실시간 폴링)
2. **원격 모니터링 에이전트 (6대 노드 공통)**
   - **언어/라이브러리**: Python 3.9+, `psutil`, `requests`, `wmi` (Windows 전용 선택적 임포트)
   - **지원 OS**: Windows, Linux (Debian/Ubuntu/Proxmox VE, Armbian, Raspberry Pi OS)

---

## 3. 목표 디렉터리 구조 (Target Directory Structure)
에이전트는 아래의 디렉터리 구조를 생성하고 각 파일을 모듈화하여 작성해야 한다.

```text
rack-controller/
├── README.md                  # 설치, 배선, 실행 및 배포 가이드
├── config.json                # 서버 설정, 센서 별칭, 팬 커브 임계값 설정 파일
├── server/                    # 메인 컨트롤러 (Raspberry Pi 5)
│   ├── requirements.txt       # fastapi, uvicorn, pydantic, gpiozero, lgpio
│   ├── main.py                # FastAPI 엔트리포인트 및 백그라운드 태스크 실행
│   ├── models.py              # Pydantic 데이터 스키마 정의
│   ├── hardware.py            # DS18B20 온도 리딩 & 4채널 PWM 제어 (Mock Fallback 포함)
│   ├── controller.py          # 노드 상태 관리 및 자동 팬 커브 제어 로직
│   └── static/
│       ├── index.html         # 메인 웹 대시보드 UI
│       └── app.js             # 프론트엔드 상태 폴링 및 팬 제어 스크립트
├── agent/                     # 6대 노드에 배포할 모니터링 에이전트
│   ├── requirements.txt       # psutil, requests, wmi(sys_platform == 'win32')
│   ├── agent_config.json      # 서버 URL, Node ID, 전송 주기 설정
│   └── agent.py               # 크로스 플랫폼 메트릭 수집 및 HTTP POST 전송
└── deploy/                    # 서비스 등록 및 자동 실행 스크립트
    ├── rack-server.service    # RPi 5 메인 서버용 systemd 서비스 파일
    ├── rack-agent.service     # Linux 노드용 systemd 서비스 파일
    └── build_win_agent.bat    # Windows 노드용 PyInstaller 단일 실행파일 빌드 스크립트
```

---

## 4. 하드웨어 핀맵 및 입출력 명세 (Hardware Specification)
* **1-Wire 온도 센서 (DS18B20 다중 연결)**
  - 데이터 핀: **BCM GPIO 4** (물리 핀 7)
  - 데이터 읽기 경로: `/sys/bus/w1/devices/28-*/w1_slave`
* **4채널 팬 PWM 제어**
  - 채널 1 (하단 흡기): **BCM GPIO 12** (물리 핀 32)
  - 채널 2 (서버/SBC층): **BCM GPIO 13** (물리 핀 33)
  - 채널 3 (전원/네트워크): **BCM GPIO 18** (물리 핀 12)
  - 채널 4 (상단 배기): **BCM GPIO 19** (물리 핀 35)
  - 기본 주파수(Frequency): `100Hz` (`config.json`에서 변경 가능하도록 설계)

---

## 5. 모듈별 상세 기능 요구사항 (Detailed Module Specs)

### 5.1 설정 파일 (`config.json`)
- 서버 포트, PWM 주파수, 타임아웃 시간(초)
- 1-Wire 센서 ID(`28-xxxx`)와 화면 표시 이름(예: `"랙 상단 배기"`, `"SMPS 주변"`) 매핑 딕셔너리
- 팬 자동 제어(Auto Mode) 온도 커브 기준값:
  - `rack_temp_min` (예: 30.0°C), `rack_temp_max` (예: 50.0°C)
  - `node_temp_min` (예: 45.0°C), `node_temp_max` (예: 80.0°C)
  - `min_fan_duty` (예: 30%), `max_fan_duty` (예: 100%)
- 런타임 중 웹에서 설정 변경 시 `config.json`에 즉시 저장(Persistence)되도록 구현.

### 5.2 하드웨어 추상화 계층 (`server/hardware.py`)
- **GPIO 초기화**: `LGPIOFactory()`를 시도하고, 실패하거나 비-Linux 환경일 경우 `MockHardware` 모드로 자동 전환(콘솔에 경고 출력 후 가상 센서값 및 가상 PWM 상태 유지).
- **온도 센서 읽기**: `/sys/bus/w1/devices/28-*` 경로를 비동기 또는 스레드 풀(`asyncio.to_thread`)로 읽어 메인 이벤트 루프 블로킹을 방지할 것.
- **PWM 출력 제어**: 채널(1~4)별 듀티비(0~100%)를 입력받아 `0.0 ~ 1.0`의 float 값으로 변환하여 출력.

### 5.3 백엔드 API 및 컨트롤러 (`server/main.py`, `server/controller.py`)
- `POST /api/metrics`: 에이전트로부터 노드 상태(`node_id`, `os`, `cpu_temp`, `cpu_usage`, `mem_usage`, `disk_usage`, `load_avg`, `uptime`) 수신 및 인메모리 저장.
- `GET /api/status`: 전체 노드 상태(마지막 수신 후 10초 경과 시 `online: false` 처리), 서버랙 DS18B20 온도 목록, 현재 4채널 팬 속도 및 모드(`auto_mode`) 반환.
- `POST /api/fans`: 팬 제어 모드(`auto_mode: bool`) 전환 및 수동 모드일 때 채널별(1~4) 목표 듀티비(0~100%) 즉시 적용.
- `POST /api/config/sensor-alias`: 웹 UI에서 센서 ID의 별칭을 수정하면 `config.json`에 업데이트.
- **백그라운드 제어 루프**: 2초 주기로 랙 온도 측정 및 `auto_mode == True`일 때 랙 최고 온도와 온라인 노드의 최고 CPU 온도를 비교하여 선형 보간(Linear Interpolation)으로 팬 듀티비 자동 산출 및 적용.

### 5.4 웹 대시보드 (`server/static/index.html`, `server/static/app.js`)
- **디자인**: 다크 테마 기반의 반응형 대시보드 (Tailwind CSS 활용).
- **상단 요약 바**: 전체 온라인 노드 수(예: `6 / 6 Online`), 최고 랙 온도, 현재 팬 제어 모드 배지, Mock 모드 동작 여부 표시.
- **랙 온도 섹션**: 연결된 DS18B20 센서별 온도 카드 표시 (클릭 시 별칭 수정 모달/프롬프트 제공, 45°C 이상 시 경고 색상 강조).
- **4채널 팬 컨트롤 섹션**:
  - `Auto / Manual` 토글 스위치.
  - 채널 1~4 각각의 슬라이더(0~100%) 및 현재 듀티비(%) 수치 표시.
  - 사용자가 슬라이더를 드래그하는 동안(`isDragging`)에는 폴링 데이터에 의해 슬라이더 위치가 튀지 않도록 잠금 처리.
- **클러스터 노드 그리드 (6대)**:
  - 노드 이름, OS 아이콘/배지, 온라인/오프라인 상태 표시.
  - CPU 온도(75°C 이상 시 붉은색 강조), Load Average, Uptime 표시.
  - CPU, RAM, Disk 사용률 프로그레스 바 (70% 이상 주의, 85% 이상 위험 색상 변경).

### 5.5 크로스 플랫폼 에이전트 (`agent/agent.py`)
- `agent_config.json` 파일(없으면 환경변수 또는 기본값 생성)을 읽어 동작.
- **Linux 온도 수집**: `psutil.sensors_temperatures()`에서 `cpu_thermal`, `coretemp`, `k10temp`, `soc_thermal` 등을 탐색하고 없을 경우 `/sys/class/thermal/thermal_zone0/temp` 직접 파싱.
- **Windows 온도 수집**: `wmi` 모듈을 통해 `root\LibreHardwareMonitor` 또는 `root\OpenHardwareMonitor` 네임스페이스의 CPU Temperature 센서 조회, 없을 경우 예외 발생 없이 `0.0` 반환.
- 네트워크 단절 시 프로그램이 종료되지 않도록 예외 처리 및 재시도 로깅 구현.

---

## 6. 단계별 실행 계획 (Execution Phases)

안티그래비티 에이전트는 아래 순서대로 작업을 진행하고 각 단계 완료 시 코드의 구문 오류 및 실행 가능 여부를 검증한다.

- **[Phase 1] 프로젝트 스캐폴딩 및 설정 구성**
  - 디렉터리 구조 생성, `config.json`, `agent_config.json`, `requirements.txt` 작성.
- **[Phase 2] 하드웨어 제어 모듈 및 Mock 시스템 개발**
  - `server/models.py` 및 `server/hardware.py` 구현 (RPi 5 `lgpio` 연동 및 로컬 테스트용 Mock 데이터 생성기 포함).
- **[Phase 3] FastAPI 백엔드 및 자동 팬 컨트롤러 개발**
  - `server/controller.py` 및 `server/main.py` 작성. 백그라운드 루프 및 REST API 엔드포인트 구현.
- **[Phase 4] 프론트엔드 웹 대시보드 개발**
  - `server/static/index.html` 및 `server/static/app.js` 작성. 실시간 UI 업데이트 및 팬 슬라이더 조작 UX 구현.
- **[Phase 5] 원격 모니터링 에이전트 및 배포 파일 개발**
  - `agent/agent.py` 작성 및 `deploy/` 폴더 내 Linux `systemd` 서비스 파일, Windows 빌드 스크립트, `README.md` 작성.
- **[Phase 6] 로컬 시뮬레이션 검증**
  - 서버를 실행하고 에이전트를 로컬에서 구동하여 메트릭 수집, Mock 온도 표시, 팬 제어 API가 정상 동작하는지 테스트.
