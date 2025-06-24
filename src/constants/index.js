import {
    backend,
    web,
    javascript,
    typescript,
    html,
    css,
    reactjs,
    redux,
    tailwind,
    nodejs,
    mongodb,
    git,
    figma,
    docker,
    iseclub,
    threejs,
    codinglab,
    dndts,
    c4ngp,
    java,
    discreteevent,
    iseclubwebsite,
    AIS,
    EcoLens,
    MWH,
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
        title: "Web Developer",
        icon: web,
    },

    {
        title: "Backend Developer",
        icon: backend,
    },
];

const technologies = [
    {
        name: "HTML 5",
        icon: html,
    },
    {
        name: "CSS 3",
        icon: css,
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
        name: "React JS",
        icon: reactjs,
    },
    {
        name: "Java",
        icon: java,
    },
    {
        name: "Tailwind CSS",
        icon: tailwind,
    },
    {
        name: "Node JS",
        icon: nodejs,
    },
    {
        name: "MongoDB",
        icon: mongodb,
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
    {
        name: "docker",
        icon: docker,
    },
];

const experiences = [
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
    {
        title: "Software Engineer",
        company_name: "DNDTS Pte Ltd",
        icon: dndts,
        iconBg: "#383E56",
        date: "May 2024 - Aug 2024",
        points: [
            "Automated HR processes by developing a Telegram bot for streamlined operations.",
            "Built a batch QR code scanner to efficiently register repaired phones into the system.",
            "Optimized workflows, reducing manual effort and improving efficiency.",
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
        title: "Frontend Developer",
        company_name: "Centre of Excellence for Next Generation Ports",
        icon: c4ngp,
        iconBg: "#E6DEDD",
        date: "Dec 2024 - Present",
        points: [
            "Developed a dynamic Next.js website to display vessel data via AIS API integration, ensuring seamless user interaction.",
            "Implemented interactive tables with time-range filtering and sorting for enhanced usability.",
            "Integrated map visualization for real-time vessel tracking and data engagement.",
            "Optimized API performance and data rendering to reduce latency for large-scale maritime data.",
            "Built an accessible, responsive, and intuitive platform for stakeholders requiring real-time insights.",
        ],
    },
];

const testimonials = [];

const projects = [
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

export { services, technologies, experiences, testimonials, projects };
