"""
Default starter questions and checklist items for interview preparation.
"""

DEFAULT_PREP_ITEMS = [
    # Preparation Checklist
    {
        "category": "checklist",
        "title": "Research company mission, products, and recent press/news",
        "description": "Understand the company's business model, target market, latest milestones, and core competitors.",
    },
    {
        "category": "checklist",
        "title": "Analyze the job description & map your top 3 achievements",
        "description": "Identify the primary skills and prepare concise stories highlighting how you delivered results using them.",
    },
    {
        "category": "checklist",
        "title": "Draft 3-5 thoughtful questions for the interviewers",
        "description": "Ask about engineering challenges, team culture, deployment cycles, and 90-day success expectations.",
    },
    {
        "category": "checklist",
        "title": "Verify technical setup (audio, video, internet, quiet workspace)",
        "description": "Test microphone clarity, camera angle, headphones, lighting, and any required platforms (Zoom, Meet, Teams).",
    },
    {
        "category": "checklist",
        "title": "Prepare your resume, portfolio links, and GitHub repositories",
        "description": "Keep copies accessible on screen for quick reference during screen share discussions.",
    },

    # HR Questions
    {
        "category": "hr",
        "title": "Tell me about yourself and walk me through your background.",
        "description": "Structure your pitch: Present (current focus/skills) -> Past (key milestone/project) -> Future (why this role excites you). Keep it to 90 seconds.",
    },
    {
        "category": "hr",
        "title": "Why are you interested in joining our company?",
        "description": "Demonstrate knowledge of their product or mission. Connect their current growth stage to your personal technical goals.",
    },
    {
        "category": "hr",
        "title": "What are your salary expectations for this role?",
        "description": "Provide a well-researched market range based on your experience, location, and the role's level of responsibility.",
    },
    {
        "category": "hr",
        "title": "Why are you looking to leave your current role or make a transition?",
        "description": "Stay positive: focus on seeking greater technical ownership, impactful scope, and career growth opportunities.",
    },
    {
        "category": "hr",
        "title": "Where do you see yourself in 3 to 5 years?",
        "description": "Express ambition for technical depth or leadership, while staying grounded in delivering value today.",
    },

    # Technical Questions
    {
        "category": "technical",
        "title": "Explain RESTful API design principles and HTTP status codes.",
        "description": "Discuss statelessness, resource naming, standard HTTP verbs (GET, POST, PUT, PATCH, DELETE), idempotent operations, and codes (200, 201, 400, 401, 403, 404, 500).",
    },
    {
        "category": "technical",
        "title": "How do you optimize slow database queries and design indexes?",
        "description": "Cover EXPLAIN queries, B-tree indexes, avoiding N+1 queries using prefetch/select_related, database normal forms vs indexing trade-offs.",
    },
    {
        "category": "technical",
        "title": "How do you manage application state and asynchronous operations in React?",
        "description": "Explain useState, useEffect, context API, custom hooks, and handling side-effects with Axios or async/await.",
    },
    {
        "category": "technical",
        "title": "Explain authentication vs authorization and how session/JWT auth works.",
        "description": "Detail cookie-based session auth with CSRF tokens vs stateless JWT tokens, bearer headers, refresh tokens, and security tradeoffs.",
    },
    {
        "category": "technical",
        "title": "Walk through how you approach designing a scalable web system.",
        "description": "Break down requirements, traffic estimation, database modeling, caching (Redis), load balancing, and horizontal scaling.",
    },

    # Behavioral Questions (STAR Method)
    {
        "category": "behavioral",
        "title": "Tell me about a time you handled a difficult conflict or technical disagreement with a teammate.",
        "description": "STAR: Situation (the debate), Task (the mutual goal), Action (active listening, prototyping data-driven proofs), Result (consensus and positive outcome).",
    },
    {
        "category": "behavioral",
        "title": "Describe a production bug or unexpected incident you had to resolve under pressure.",
        "description": "Highlight systematic debugging, rollback strategy, clear communication with stakeholders, post-mortem, and preventive testing.",
    },
    {
        "category": "behavioral",
        "title": "Tell me about a project where requirements changed midway or were ambiguous.",
        "description": "Show how you clarified priorities, decomposed work into iterative milestones, and maintained team velocity.",
    },
    {
        "category": "behavioral",
        "title": "Give an example of receiving critical feedback and how you acted on it.",
        "description": "Emphasize high receptive mindset, emotional intelligence, measurable improvement, and follow-through.",
    },
]
