"""
Rule-based Resume & Job Description Skill Analyzer.
Deterministic pattern matching and vocabulary extraction. No generative AI or hallucinations.
"""
import re
from typing import Dict, List, Set, Tuple

# Comprehensive taxonomy of industry skills and aliases
SKILL_TAXONOMY = {
    # Core Languages
    "Python": [r"\bpython\b"],
    "JavaScript": [r"\bjavascript\b", r"\bjs\b", r"\bes6\b"],
    "TypeScript": [r"\btypescript\b", r"\bts\b"],
    "Java": [r"\bjava\b(?!script)"],
    "C++": [r"\bc\+\+\b", r"\bcpp\b"],
    "C#": [r"\bc\#\b", r"\bcsharp\b", r"\b\.net\b"],
    "Go / Golang": [r"\bgolang\b", r"\bgo\s+language\b"],
    "Rust": [r"\brust\b"],
    "PHP": [r"\bphp\b"],
    "Ruby": [r"\bruby\b"],
    "Swift": [r"\bswift\b"],
    "Kotlin": [r"\bkotlin\b"],
    "SQL": [r"\bsql\b"],
    "HTML / HTML5": [r"\bhtml\b", r"\bhtml5\b"],
    "CSS / CSS3": [r"\bcss\b", r"\bcss3\b"],
    "Bash / Shell": [r"\bbash\b", r"\bshell\b", r"\bpowershell\b"],
    "R": [r"\br\s+programming\b", r"\br\s+language\b"],

    # Frontend Frameworks & Web Tech
    "React": [r"\breact\b", r"\breact\.js\b", r"\breactjs\b"],
    "Vue.js": [r"\bvue\b", r"\bvue\.js\b", r"\bvuejs\b"],
    "Angular": [r"\bangular\b", r"\bangularjs\b"],
    "Next.js": [r"\bnext\.js\b", r"\bnextjs\b"],
    "Redux": [r"\bredux\b", r"\bredux\s+toolkit\b"],
    "Tailwind CSS": [r"\btailwind\b", r"\btailwind\s*css\b"],
    "Bootstrap": [r"\bbootstrap\b"],
    "Responsive Design": [r"\bresponsive\s+design\b", r"\bmobile[- ]first\b"],
    "Web Accessibility (a11y)": [r"\ba11y\b", r"\baccessibility\b", r"\bwcag\b"],
    "Vite / Webpack": [r"\bvite\b", r"\bwebpack\b"],

    # Backend & APIs
    "Django": [r"\bdjango\b"],
    "Django REST Framework": [r"\bdjango\s+rest\s+framework\b", r"\bdrf\b"],
    "FastAPI": [r"\bfastapi\b"],
    "Flask": [r"\bflask\b"],
    "Node.js": [r"\bnode\.js\b", r"\bnodejs\b", r"\bnode\b"],
    "Express.js": [r"\bexpress\b", r"\bexpress\.js\b", r"\bexpressjs\b"],
    "Spring Boot": [r"\bspring\s+boot\b", r"\bspring\s+framework\b"],
    "RESTful APIs": [r"\brest\s*api[s]?\b", r"\brestful\b"],
    "GraphQL": [r"\bgraphql\b"],
    "Microservices": [r"\bmicroservices?\b"],
    "Celery / Message Queues": [r"\bcelery\b", r"\brabbitmq\b", r"\bkafka\b"],
    "WebSockets": [r"\bwebsockets?\b", r"\bsocket\.io\b"],

    # Databases & Storage
    "PostgreSQL": [r"\bpostgresql\b", r"\bpostgres\b"],
    "MySQL": [r"\bmysql\b"],
    "SQLite": [r"\bsqlite\b", r"\bsqlite3\b"],
    "MongoDB": [r"\bmongodb\b", r"\bmongo\b"],
    "Redis": [r"\bredis\b"],
    "Elasticsearch": [r"\belasticsearch\b"],
    "ORM": [r"\borm\b", r"\bsqlalchemy\b", r"\bprisma\b", r"\bdjango\s+orm\b"],
    "Database Indexing & Optimization": [r"\bindexing\b", r"\bquery\s+optimization\b", r"\bdata\s+modeling\b"],

    # Cloud & DevOps
    "AWS": [r"\baws\b", r"\bamazon\s+web\s+services\b", r"\bec2\b", r"\bs3\b", r"\blambda\b"],
    "Google Cloud (GCP)": [r"\bgcp\b", r"\bgoogle\s+cloud\b"],
    "Azure": [r"\bazure\b"],
    "Docker": [r"\bdocker\b", r"\bcontainerization\b"],
    "Kubernetes": [r"\bkubernetes\b", r"\bk8s\b"],
    "CI/CD": [r"\bci/cd\b", r"\bcontinuous\s+integration\b", r"\bgithub\s+actions\b", r"\bjenkins\b"],
    "Linux / Unix": [r"\blinux\b", r"\bunix\b", r"\bubuntu\b"],
    "Nginx": [r"\bnginx\b"],
    "Terraform": [r"\bterraform\b", r"\biac\b", r"\binfrastructure\s+as\s+code\b"],
    "Git / Version Control": [r"\bgit\b", r"\bgithub\b", r"\bgitlab\b"],

    # Testing & Quality
    "Unit Testing": [r"\bunit\s+test(ing)?\b", r"\bpytest\b", r"\bjest\b", r"\bmocha\b", r"\bunittest\b"],
    "Test-Driven Development (TDD)": [r"\btdd\b", r"\btest[- ]driven\b"],
    "End-to-End Testing": [r"\be2e\b", r"\bcypress\b", r"\bplaywright\b", r"\bselenium\b"],
    "Code Review": [r"\bcode\s+reviews?\b", r"\bpull\s+requests?\b"],

    # Architecture & Practices
    "System Design": [r"\bsystem\s+design\b", r"\bdistributed\s+systems?\b", r"\bscalability\b"],
    "Object-Oriented Programming (OOP)": [r"\boop\b", r"\bobject[- ]oriented\b"],
    "Agile / Scrum": [r"\bagile\b", r"\bscrum\b", r"\bsprints?\b", r"\bjira\b"],
    "Security Best Practices": [r"\bowasp\b", r"\bcsrf\b", r"\bxss\b", r"\bauthentication\b", r"\bauthorization\b", r"\bjwt\b", r"\boauth\b"],

    # Professional & Soft Skills
    "Problem Solving": [r"\bproblem[- ]solving\b", r"\btroubleshooting\b", r"\bdebugging\b"],
    "Communication": [r"\bcommunication\b", r"\bwritten\s+communication\b", r"\bverbal\s+communication\b"],
    "Team Leadership / Mentorship": [r"\bleadership\b", r"\bmentor(ing|ship)?\b", r"\bteam\s+lead\b"],
    "Cross-functional Collaboration": [r"\bcollaboration\b", r"\bcross[- ]functional\b", r"\bteam\s+player\b"],
    "Project Management": [r"\bproject\s+management\b", r"\btime\s+management\b", r"\bprioritization\b"],
}

# Designated priority tiers for skills
HIGH_IMPORTANCE_SKILLS = {
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go / Golang", "SQL",
    "React", "Django", "Django REST Framework", "FastAPI", "Node.js", "Spring Boot",
    "PostgreSQL", "Docker", "AWS", "System Design", "RESTful APIs", "CI/CD"
}


def extract_skills_from_text(text: str) -> Dict[str, int]:
    """
    Extracts matching skills from input text and returns a dictionary of {skill_name: occurrence_count}.
    """
    if not text:
        return {}

    lowered_text = text.lower()
    found_skills: Dict[str, int] = {}

    for skill_name, patterns in SKILL_TAXONOMY.items():
        count = 0
        for pattern in patterns:
            matches = re.findall(pattern, lowered_text, flags=re.IGNORECASE)
            count += len(matches)

        if count > 0:
            found_skills[skill_name] = count

    return found_skills


def analyze_skills(resume_text: str, job_description: str) -> Dict:
    """
    Rule-based comparison between resume text and job description.
    Deterministic, explainable, and zero hallucinations.
    """
    resume_skills_dict = extract_skills_from_text(resume_text)
    jd_skills_dict = extract_skills_from_text(job_description)

    skills_in_resume = sorted(list(resume_skills_dict.keys()))
    skills_required = sorted(list(jd_skills_dict.keys()))

    resume_set = set(skills_in_resume)
    jd_set = set(skills_required)

    matching_skills = sorted(list(resume_set.intersection(jd_set)))
    missing_skills = sorted(list(jd_set - resume_set))
    extra_skills = sorted(list(resume_set - jd_set))

    # Determine important skills in JD (based on high-tier or frequency >= 2 in JD)
    important_skills = []
    for skill in skills_required:
        is_high = skill in HIGH_IMPORTANCE_SKILLS or jd_skills_dict.get(skill, 0) >= 2
        importance_level = "High" if is_high else "Medium"
        status = "Matched" if skill in resume_set else "Missing"
        important_skills.append({
            "skill": skill,
            "importance": importance_level,
            "status": status,
            "frequency_in_jd": jd_skills_dict.get(skill, 1),
        })

    # Sort important skills: High importance first, then by frequency descending
    important_skills.sort(
        key=lambda x: (x["importance"] == "High", x["frequency_in_jd"]),
        reverse=True
    )

    # Compute match percentage
    if len(skills_required) > 0:
        # Weighted score: high importance matches weigh 2x
        total_weight = 0
        earned_weight = 0
        for s in skills_required:
            weight = 2 if s in HIGH_IMPORTANCE_SKILLS else 1
            total_weight += weight
            if s in resume_set:
                earned_weight += weight

        match_percentage = round((earned_weight / total_weight) * 100) if total_weight > 0 else 0
    elif len(skills_in_resume) > 0:
        match_percentage = 50
    else:
        match_percentage = 0

    match_percentage = max(0, min(100, match_percentage))

    # Actionable suggestions
    suggestions = []
    if missing_skills:
        top_missing = [s for s in missing_skills if s in HIGH_IMPORTANCE_SKILLS][:4]
        if not top_missing:
            top_missing = missing_skills[:4]
        suggestions.append(
            f"Add emphasis or project evidence for these target skills: {', '.join(top_missing)}."
        )

    if match_percentage >= 80:
        readiness_badge = "Excellent Match"
        summary = "Strong alignment between resume qualifications and job description requirements."
    elif match_percentage >= 55:
        readiness_badge = "Competitive Match"
        summary = "Good foundation with a few notable skill gaps to address in your resume or interview prep."
    elif match_percentage >= 30:
        readiness_badge = "Moderate Gap"
        summary = "Several core qualifications from the job posting are not explicitly mentioned in the resume."
    else:
        readiness_badge = "High Gap"
        summary = "Low keyword and skill correlation. Tailor your resume specifically for this job description."

    return {
        "engine": "CareerFlow Rule-Based Lexical Matcher v1.0",
        "match_percentage": match_percentage,
        "readiness_badge": readiness_badge,
        "summary": summary,
        "skills_found_in_resume": skills_in_resume,
        "skills_required": skills_required,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "extra_skills": extra_skills,
        "important_skills": important_skills,
        "total_required": len(skills_required),
        "total_matched": len(matching_skills),
        "total_missing": len(missing_skills),
        "suggestions": suggestions,
    }
