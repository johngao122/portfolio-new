import {
    backend,
    web,
    mobile,
    creator,
    javascript,
    typescript,
    html,
    css,
    reactjs,
    redux,
    tailwind,
    nodejs,
    git,
    figma,
    docker,
    iseclub,
    threejs,
    codinglab,
    dndts,
    c4ngp,
    sap,
    java,
    go,
    python,
    kubernetes,
    springboot,
    kafka,
    nextjs,
    fastapi,
    flask,
    postgresql,
    neo4j,
    redis,
    azure,
    discreteevent,
    iseclubwebsite,
    AIS,
    EcoLens,
    MWH,
    Kobae,
    ISEBuddy,
    Mittens,
    ConvSearch,
} from "../assets";

export const navLinks = [
    {
        id: "about",
        title: "About",
    },
    {
        id: "work",
        title: "Work",
    },
    {
        id: "contact",
        title: "Contact",
    },
];

const services = [
    {
        title: "AI Engineer",
        icon: creator,
    },
    {
        title: "Platform Engineer",
        icon: backend,
    },
    {
        title: "Backend Developer",
        icon: web,
    },
    {
        title: "Full-Stack Developer",
        icon: mobile,
    },
];

const technologies = [
    {
        name: "Java",
        icon: java,
    },
    {
        name: "Go",
        icon: go,
    },
    {
        name: "Python",
        icon: python,
    },
    {
        name: "JavaScript",
        icon: javascript,
    },
    {
        name: "TypeScript",
        icon: typescript,
    },
    {
        name: "Spring Boot",
        icon: springboot,
    },
    {
        name: "React JS",
        icon: reactjs,
    },
    {
        name: "Next JS",
        icon: nextjs,
    },
    {
        name: "Node JS",
        icon: nodejs,
    },
    {
        name: "FastAPI",
        icon: fastapi,
    },
    {
        name: "Flask",
        icon: flask,
    },
    {
        name: "Kubernetes",
        icon: kubernetes,
    },
    {
        name: "Docker",
        icon: docker,
    },
    {
        name: "Kafka",
        icon: kafka,
    },
    {
        name: "PostgreSQL",
        icon: postgresql,
    },
    {
        name: "Neo4j",
        icon: neo4j,
    },
    {
        name: "Redis",
        icon: redis,
    },
    {
        name: "Azure",
        icon: azure,
    },
    {
        name: "HTML 5",
        icon: html,
    },
    {
        name: "CSS 3",
        icon: css,
    },
    {
        name: "Tailwind CSS",
        icon: tailwind,
    },
    {
        name: "Three JS",
        icon: threejs,
    },
    {
        name: "git",
        icon: git,
    },
    {
        name: "figma",
        icon: figma,
    },
];

const experiences = [
    {
        title: "AI Engineer Intern",
        company_name: "SAP — Personalized Recommendation Team",
        icon: sap,
        iconBg: "#E6DEDD",
        date: "Jul 2026 - Present",
        points: [
            "Improved platform test coverage for Tabular Orchestration by 20%, strengthening reliability of tabular AI model deployment and inference validation and preparing the service for general availability.",
            "Implemented a fan-out pagination strategy for additional context retrieval in tabular AI models, improving retrieval efficiency by 30% for large-scale queries.",
        ],
    },
    {
        title: "AI Platform Engineer Intern",
        company_name: "SAP AI Core",
        icon: sap,
        iconBg: "#E6DEDD",
        date: "Jan 2026 - Jun 2026",
        points: [
            "Built and maintained the LLM Access performance and SLO observability dashboards, instrumenting custom metrics across 15+ endpoints in the LLM proxy and serving stack.",
            "Extended SLO observability with a cross-cluster sync pipeline spanning 20+ clusters and automated Postgres backup/restore for the performance dashboard, safeguarding historical metrics and improving reliability.",
            "Participated in releasing and setting up the serving of proxied and open-source models within the cluster, expanding the range of models available through the LLM Access platform.",
        ],
    },
    {
        title: "Software Engineer",
        company_name: "Centre of Excellence in Modelling and Simulation",
        icon: c4ngp,
        iconBg: "#E6DEDD",
        date: "Dec 2024 - Present",
        points: [
            "Designed and deployed a scalable Flask and Next.js full stack application to power a real-time vessel tracking platform, aligning with large-scale, high-performance system design.",
            "Transformed monthly refresh cycles into hourly updates by building ingestion pipelines, optimizing data efficiency and enabling real-time insights for faster, data-driven decision-making.",
            "Automated CI/CD workflows with Docker and testing, reducing deployment cycles by 50% and contributing reusable, production-ready release processes.",
        ],
    },
    {
        title: "Web Developer",
        company_name: "NUS Industrial & Systems Engineering Club",
        icon: iseclub,
        iconBg: "#E6DEDD",
        date: "Aug 2024 - Present",
        points: [
            "Designed and implemented the website’s backend system for seamless functionality.",
            "Developed the UI and overall design, ensuring an intuitive user experience.",
            "Maintained and updated website content to reflect current events.",
        ],
    },
    {
        title: "Coding Educator",
        company_name: "Coding Lab",
        icon: codinglab,
        iconBg: "#383E56",
        date: "Nov 2023 - Jan 2024, Dec 2024 - Jan 2025",
        points: [
            "Taught Python to secondary school students, focusing on fundamentals, problem-solving, and real-world applications.",
            "Designed interactive lessons with tailored tutorials and assessments.",
            "Developed customized evaluations to track progress and provide targeted feedback on Python and App Inventor concepts.",
        ],
    },
];

const testimonials = [];

const accolades = [
    {
        type: "Award",
        title: "Hack4Good — Top 10",
        issuer: "NUS Developer Student Clubs Hackathon",
        year: "2025",
    },
    {
        type: "Award",
        title: "LifeHack — Top 10",
        issuer: "NUS Students' Computing Club",
        year: "2025",
    },
    {
        type: "Certification",
        title: "Google Advanced Data Analytics",
        issuer: "Google",
        year: "",
    },
    {
        type: "Certification",
        title: "IBM DevOps and Software Engineering",
        issuer: "IBM",
        year: "",
    },
];

const projects = [
    {
        name: "Kobae",
        description:
            "A scalable professional networking platform for aspiring students. Engineered a Spring Boot backend handling 10,000 concurrent requests at ~200ms average API response times, backed by PostgreSQL, Neo4j, and Redis caching for reliable high-performance results validated during alpha testing.",
        tags: [
            {
                name: "springboot",
                color: "blue-text-gradient",
            },
            {
                name: "postgres",
                color: "green-text-gradient",
            },
            {
                name: "neo4j",
                color: "pink-text-gradient",
            },
            {
                name: "redis",
                color: "blue-text-gradient",
            },
            {
                name: "flutter",
                color: "green-text-gradient",
            },
        ],
        image: Kobae,
        source_code_link: "https://www.kobaeapp.com/",
    },
    {
        name: "Mittens",
        description:
            "An IntelliJ IDEA plugin and Next.js visualization suite for TikTok's Knit dependency injection framework, built at TikTok TechJam 2025. Achieves 94%+ detection accuracy with under 5% false positives across dependency graphs of 1,000+ nodes, rendering real-time force-directed graphs in Kotlin, React, and D3.js over Server-Sent Events to surface circular dependencies directly in the IDE.",
        tags: [
            {
                name: "kotlin",
                color: "blue-text-gradient",
            },
            {
                name: "nextjs",
                color: "green-text-gradient",
            },
            {
                name: "d3js",
                color: "pink-text-gradient",
            },
        ],
        image: Mittens,
        source_code_link: "https://github.com/johngao122/Mittens",
    },
    {
        name: "Conversational Shopping Search Agent",
        description:
            "A deterministic, fully offline conversational product-search agent for TikTok TechJam 2026 (Track 4) that finds a customer's target product within ten turns through clarifying questions and progressive re-ranking. Reaches a 0.969 technical score on 200 evaluation sessions (HitRate@10 1.00, MRR 0.968, 2.07 mean turns) with zero LLM calls on the scored path.",
        tags: [
            {
                name: "python",
                color: "blue-text-gradient",
            },
            {
                name: "ai-agent",
                color: "green-text-gradient",
            },
            {
                name: "retrieval",
                color: "pink-text-gradient",
            },
        ],
        image: ConvSearch,
        source_code_link:
            "https://github.com/johngao122/techjam-conversational-search",
    },
    {
        name: "ISEBuddy",
        description:
            "A reusable document-analytics system that processes 500+ files to automate knowledge extraction, cutting manual retrieval time by 80% and preparation time by 60% to accelerate high-value content creation.",
        tags: [
            {
                name: "python",
                color: "blue-text-gradient",
            },
            {
                name: "document-analytics",
                color: "green-text-gradient",
            },
            {
                name: "automation",
                color: "pink-text-gradient",
            },
        ],
        image: ISEBuddy,
        source_code_link: "https://github.com/johngao122/ISEBuddy",
    },
    {
        name: "Discrete Event Simulator",
        description:
            "A Java-based Discrete Event Simulator that models and processes events in a controlled simulation environment. It features an immutable priority queue, event-driven execution, and dynamic entity interactions to simulate real-world processes efficiently.",
        tags: [
            {
                name: "java",
                color: "blue-text-gradient",
            },
            {
                name: "event-driven architecture",
                color: "green-text-gradient",
            },
            {
                name: "simulator",
                color: "pink-text-gradient",
            },
        ],
        image: discreteevent,
        source_code_link:
            "https://github.com/johngao122/Discrete-Event-Simulator",
    },
    {
        name: "ISE Club Website",
        description:
            "A central hub for the NUS ISE Club, designed to engage undergraduates and alumni, foster community interaction, and provide up-to-date information on club activities and events.",
        tags: [
            {
                name: "react",
                color: "blue-text-gradient",
            },
            {
                name: "nginx",
                color: "green-text-gradient",
            },
            {
                name: "lotte animations",
                color: "pink-text-gradient",
            },
        ],
        image: iseclubwebsite,
        source_code_link: "https://github.com/clubisenus/iseWebsiteV2",
    },
    {
        name: "AIS Web Portal",
        description:
            "A real-time vessel tracking platform designed to provide accessible and interactive maritime data. It enables users to view and analyze vessel movements through API-integrated data, interactive tables, and map visualizations, ensuring seamless access to time-sensitive maritime insights.",
        tags: [
            {
                name: "nextjs",
                color: "blue-text-gradient",
            },
            {
                name: "rest-api",
                color: "green-text-gradient",
            },
            {
                name: "flask",
                color: "pink-text-gradient",
            },
        ],
        image: AIS,
        source_code_link: "https://github.com/johngao122/AIS-Web-Portal",
    },
    {
        name: "Muhammadiyah Welfare Hub",
        description:
            "A web-based minimart and voucher system for Muhammadiyah Welfare Home, built with Next.js and Spring Boot, enabling residents to manage tasks and purchases while administrators oversee inventory and user accounts.",
        tags: [
            {
                name: "nextjs",
                color: "blue-text-gradient",
            },
            {
                name: "springboot",
                color: "green-text-gradient",
            },
            {
                name: "railway",
                color: "pink-text-gradient",
            },
        ],
        image: MWH,
        source_code_link: "https://github.com/johngao122/H4G-Submission",
    },
    {
        name: "EcoLens",
        description:
            "A chrome extension that provides real-time environmental data for food items that users want to buy and suggests alternative products.",
        tags: [
            {
                name: "chromium",
                color: "blue-text-gradient",
            },
            {
                name: "FastAPI",
                color: "green-text-gradient",
            },
            {
                name: "MySQL",
                color: "pink-text-gradient",
            },
        ],
        image: EcoLens,
        source_code_link: "https://github.com/johngao122/LifeHack-2025",
    },
    {
        name: "InsureBook",
        description:
            "An application that allows insurance agents to manage their clients and policies.",
        tags: [
            {
                name: "java",
                color: "blue-text-gradient",
            },
            {
                name: "javafx",
                color: "green-text-gradient",
            },
        ],
        image: java,
        source_code_link: "https://github.com/AY2425S2-CS2103-F08-2/tp",
    },
];

export {
    services,
    technologies,
    experiences,
    testimonials,
    accolades,
    projects,
};
