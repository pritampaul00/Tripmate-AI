# ✈️ Travora

### AI-Powered Multi-Agent Travel Planner

Travora is a full-stack AI-powered travel planning platform that transforms natural language travel requests into personalized, structured travel reports.

Built with Next.js, NestJS, LangChain, and LangGraph, Travora orchestrates specialized AI agents and travel data services to generate flight recommendations, hotel suggestions, daily itineraries, budget analysis, trip feasibility insights, and travel recommendations from a single prompt.

---

## 🌟 Why Travora?

Planning a trip often means switching between multiple platforms for flights, hotels, maps, activities, budgets, and travel research.

Travora brings these steps into a single workflow.

Simply describe your trip in natural language.

### Example

> "Plan a 5-day trip to Melbourne for 2 people with a moderate budget."

Travora processes the request and generates a structured travel report containing:

- ✈️ Recommended flight
- 🏨 Recommended accommodation
- 🗓️ Day-by-day itinerary
- 💰 Budget analysis
- 📊 Trip feasibility
- 💡 Travel recommendations
- 🔎 Alternative flight and hotel options

---

# 🚀 Features

## 🤖 Multi-Agent AI Workflow

Travora uses LangGraph to coordinate specialized AI agents responsible for different parts of the travel planning process.

Each agent focuses on a specific task while the workflow coordinates the complete trip generation process.

## ✈️ Flight Recommendations

Flight data is retrieved through SerpAPI and transformed into structured recommendations.

The report can include:

- Airline
- Departure and arrival airports
- Departure and arrival times
- Flight duration
- Number of stops
- Cabin class
- Fare type
- Estimated price
- Emissions information
- Verification timestamp
- Alternative flights

## 🏨 Hotel Recommendations

Travora generates hotel recommendations based on the destination and trip requirements.

The accommodation report includes:

- Hotel name
- Address
- Price
- Rating
- Reviews
- Room type
- Cancellation policy
- Verification information
- Recommendation reasoning
- Alternative hotels

## 🗓️ AI-Generated Daily Itinerary

Travora converts the generated travel plan into a structured day-by-day itinerary.

Each activity can contain:

- Time
- Title
- Description
- Location
- Cost tier
- Candidate reference

Generated itinerary data is validated before it reaches the frontend.

## 💰 Budget Analysis

Travora provides a structured breakdown of estimated trip expenses and helps users understand the expected overall travel cost.

## 📊 Trip Feasibility

The platform evaluates the generated trip based on the available travel information and presents a dedicated feasibility section.

## 💡 Travel Recommendations

Travora provides recommendations based on the destination and selected travel dates.

## 🎨 Travel Report UI

The generated plan is presented as an editorial-style travel report with:

- Full-width destination hero
- Structured report sections
- Flight ticket-style cards
- Hotel recommendation cards
- Daily itinerary timeline
- Budget analysis
- Trip feasibility
- Travel recommendations
- Responsive layouts
- Framer Motion animations

---

# 🧠 Multi-Agent Architecture

```text
                         User Prompt
                              │
                              ▼
                    Request Processing
                              │
                              ▼
                  ┌─────────────────────┐
                  │   LangGraph Flow    │
                  └─────────────────────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
       Flight Agent      Hotel Agent     Itinerary Agent
             │                │                │
             ▼                ▼                ▼
        Flight Data       Hotel Data      Activity Data
             │                │                │
             └────────────────┼────────────────┘
                              │
                              ▼
                    Recommendation Agent
                              │
                              ▼
                    Structured Trip Plan
                              │
                              ▼
                       Zod Validation
                              │
                              ▼
                     Travel Report API
                              │
                              ▼
                       Next.js Report UI
````

The architecture separates travel data retrieval, AI reasoning, validation, and presentation.

---

# 🛠️ Tech Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Framer Motion
* Axios
* Lucide React

## Backend

* NestJS
* TypeScript
* LangChain
* LangGraph
* Zod
* Axios

## AI

* Groq LLM
* LangChain
* LangGraph

## External APIs

* SerpAPI
* Tavily Search API

---

# 📂 Project Structure

```text
Travora
│
├── travora-web/
│   │
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── ...
│   │
│   ├── components/
│   │   ├── itinerary/
│   │   │   ├── TripPage.tsx
│   │   │   │
│   │   │   ├── flight/
│   │   │   │   └── RecommendedFlight.tsx
│   │   │   │
│   │   │   ├── hotel/
│   │   │   │   └── RecommendedHotel.tsx
│   │   │   │
│   │   │   ├── daily/
│   │   │   │   └── DailyTimeline.tsx
│   │   │   │
│   │   │   ├── budget/
│   │   │   │   ├── BudgetBreakdown.tsx
│   │   │   │   └── TripFeasibility.tsx
│   │   │   │
│   │   │   └── tips/
│   │   │       └── TravelTips.tsx
│   │   │
│   │   └── report/
│   │       ├── ReportPage.tsx
│   │       ├── ReportSection.tsx
│   │       └── hero/
│   │
│   ├── services/
│   ├── types/
│   └── utils/
│
└── travora-api/
    │
    ├── src/
    │   ├── agents/
    │   │
    │   ├── common/
    │   │
    │   ├── graph/
    │   │
    │   ├── models/
    │   │
    │   ├── prompts/
    │   │
    │   ├── tools/
    │   │
    │   └── travel/
    │
    ├── prisma/
    └── package.json
```

---

# ⚙️ Prerequisites

Make sure you have the following installed:

* Node.js 20+
* npm
* Git

You will also need API credentials for the external services used by the application.

### Required API Keys

* Groq API
* SerpAPI
* Tavily Search API, if enabled by the backend configuration

---

# 🔐 Environment Variables

## Backend

Create:

```text
travora-api/.env
```

Add:

```env
PORT=3001

GROQ_API_KEY=your_groq_api_key

SERP_API_KEY=your_serpapi_api_key

TAVILY_API_KEY=your_tavily_api_key
```

Use the exact environment variable names expected by your current backend configuration.

Never commit API keys or secrets to Git.

## Frontend

Create:

```text
travora-web/.env.local
```

Add:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

# 📥 Installation

Clone the repository:

```bash
git clone https://github.com/pritampaul00/Travora.git

cd Travora
```

---

# 🔧 Backend Setup

Navigate to the backend:

```bash
cd travora-api
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run start:dev
```

The backend runs on:

```text
http://localhost:3001
```

---

# 💻 Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd travora-web
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend runs on:

```text
http://localhost:3000
```

---

# 🌐 API

## Generate Travel Plan

```http
POST /api/travel
```

### Request

```json
{
  "message": "Plan a 5-day trip to Bali under ₹80,000"
}
```

The backend processes the request through the travel planning workflow and returns a structured trip plan.

---

# 🔄 Travel Planning Flow

```text
User
 │
 ▼
Natural Language Request
 │
 ▼
Request Processing
 │
 ▼
Travel Data Retrieval
 │
 ├── Airports
 ├── Flights
 ├── Hotels
 └── Activities
 │
 ▼
AI Agents
 │
 ├── Flight Recommendation
 ├── Hotel Recommendation
 ├── Itinerary Generation
 └── Travel Recommendations
 │
 ▼
Structured Trip Plan
 │
 ▼
Runtime Validation
 │
 ▼
Next.js Travel Report
```

---

# 🛡️ Data Validation

Travora validates AI-generated itinerary data before returning it to the application.

The itinerary schema validates:

* Daily plan structure
* Day numbers
* Activity identifiers
* Activity times
* Activity titles
* Descriptions
* Locations
* Cost tiers
* Activity counts

Example:

```typescript
activities: z
  .array(
    z.object({
      candidateId: z.string().min(1),
      time: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      location: z.string().min(1),
      costTier: z.enum([
        "free",
        "low",
        "medium",
        "high",
      ]),
    }),
  )
  .min(2)
  .max(6)
```

This prevents malformed AI responses from being rendered as valid itinerary data.

---

# ⚡ Airport Search and Caching

Travora uses an airport lookup service to resolve city names into airport codes.

The service:

1. Normalizes the requested city
2. Checks the in-memory cache
3. Queries SerpAPI when needed
4. Filters invalid airport identifiers
5. Removes duplicate airports
6. Stores the result in memory
7. Returns structured airport data

Example:

```text
Melbourne
    │
    ▼
City normalization
    │
    ▼
Cache lookup
    │
    ├── Cache hit ──► Return airports
    │
    └── Cache miss
             │
             ▼
          SerpAPI
             │
             ▼
       Airport filtering
             │
             ▼
       Deduplication
             │
             ▼
        Cache result
```

---

# 🏗️ Architecture Highlights

* Full-stack TypeScript architecture
* NestJS backend
* Next.js frontend
* LangGraph-based AI orchestration
* Specialized AI agents
* Runtime validation with Zod
* External travel data integration
* Feature-based backend organization
* Reusable React components
* Responsive report interface
* Separation between data retrieval, AI processing, and presentation
* In-memory caching for airport lookups

---

# 🧪 Production Build

Before deploying, verify that both applications compile successfully.

## Frontend

```bash
cd travora-web

npm run build
```

## Backend

```bash
cd travora-api

npm run build
```

---

# 🚀 Future Improvements

Planned improvements include:

* User authentication
* Saved trips
* Travel history
* Interactive maps
* Weather-aware itinerary generation
* PDF travel report export
* Cost optimization
* Multi-city trips
* Multi-language support
* Conversational itinerary modifications
* Real-time travel data
* Booking integrations
* Persistent caching
* Personalized user preferences

---

# 🤝 Contributing

Contributions are welcome.

Fork the repository and create a feature branch:

```bash
git checkout -b feature/your-feature
```

Make your changes and commit them:

```bash
git add .

git commit -m "Add your feature"
```

Push your branch:

```bash
git push origin feature/your-feature
```

Then open a Pull Request.

---

# 👨‍💻 Author

## Pritam Paul

Full Stack Developer focused on TypeScript, Node.js, React, Next.js, backend engineering, AI integrations, and scalable web applications.

GitHub:

[https://github.com/pritampaul00](https://github.com/pritampaul00)

---

If you find Travora useful, consider giving the repository a ⭐.

```
```
