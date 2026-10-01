# StudentPathOS Documentation

## Quick Links
- [Architecture](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Demo Script](./DEMO_SCRIPT.md)
- [Coding Agent Proof](./AGENT_PROOF.md)

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.12+
- AWS CLI configured
- AWS CDK installed

### Local Development
```bash
# Frontend
cd frontend
npm install
npm run dev

# Infrastructure
cd infrastructure
npm install
npm run build
cdk synth
```

### Deployment
```bash
cd infrastructure
cdk deploy --all
```

## Project Structure
See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system architecture.
