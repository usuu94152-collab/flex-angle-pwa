# 3면 유연성 측정 PWA

학생이 각자 휴대폰에서 전후 굽힘, 좌우 굽힘, 몸통 회전 각도를 기록하고 CSV로 제출하는 React + TypeScript + Vite 앱입니다.

## 실행

```powershell
npm.cmd install
npm.cmd run dev
```

같은 네트워크의 휴대폰에서 접속할 때는 다음 명령을 사용합니다.

```powershell
npm.cmd run dev:host
```

휴대폰 센서는 보통 HTTPS에서만 동작합니다. 실제 스마트폰 테스트는 HTTPS 배포 주소, 학교 내부 HTTPS 서버, 또는 HTTPS 터널을 통해 확인하세요.

## 빌드

```powershell
npm.cmd run build
npm.cmd run preview
```

## 기록과 개인정보

기록, 등급 기준, 학생 정보는 서버로 보내지지 않고 브라우저 로컬 저장소에 저장됩니다. CSV에는 날짜, 학번, 이름, 3면 각도와 등급, 기준 버전, 측정 방식, 기기/브라우저 메모가 포함됩니다.
