# AI Job Finder

A personal AI-powered job search platform that combines automated job discovery with professional branding. The system uses AI agents to scrape job postings from multiple sources, matches them against specific criteria, and presents findings in an organized dashboard.

## Features

- 🤖 **AI-Powered Job Discovery**: Automated scraping from Indeed, LinkedIn, and remote job boards
- 🎯 **Smart Matching**: AI-driven relevance scoring and job matching
- 📊 **Analytics Dashboard**: Track job search progress and agent performance
- 🎨 **Professional Branding**: Hero section showcasing skills and contact information
- ⚙️ **Configurable Search**: Customize job criteria, locations, and salary ranges
- 📱 **Responsive Design**: Mobile-first design with TailwindCSS

## Tech Stack

### Frontend
- **Next.js 15** with TypeScript and App Router
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **React 19** with modern hooks

### Backend
- **Next.js API Routes** for REST endpoints
- **MongoDB Atlas** for data storage
- **Node.js** runtime

### AI Agents
- **Python** with Playwright/Selenium for web scraping
- **OpenAI/Claude APIs** for job relevance scoring
- **CRON scheduling** for automated execution

## Getting Started

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- MongoDB Atlas account (or local MongoDB)

### Installation

1. **Clone and setup the project:**
   ```bash
   cd ai-job-finder
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your MongoDB URI and API keys
   ```

3. **Install Python dependencies:**
   ```bash
   cd agents
   pip install -r requirements.txt
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Visit the application:**
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
ai-job-finder/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API endpoints
│   │   └── globals.css     # Global styles
│   ├── components/         # React components
│   │   ├── hero/          # Hero section components
│   │   ├── dashboard/     # Job dashboard components
│   │   ├── settings/      # Configuration components
│   │   └── analytics/     # Analytics components
│   └── lib/               # Utilities and configurations
├── agents/                # Python AI agents
│   ├── scrapers/         # Job source scraping modules
│   └── processors/       # AI processing pipeline
├── tests/                # Test files
└── public/              # Static assets
```

## Development

### Running Tests
```bash
# Frontend tests
npm test

# Python agent tests
cd agents
python -m pytest
```

### Building for Production
```bash
npm run build
```

## Deployment

- **Frontend/API**: Deploy to Vercel
- **Python Agents**: Deploy to Render with CRON scheduling
- **Database**: MongoDB Atlas (cloud-hosted)

## Environment Variables

See `.env.local.example` for required environment variables.

## License

This is a personal project for demonstration purposes.