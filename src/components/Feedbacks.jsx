import React from "react";
import { motion } from "framer-motion";

import { styles } from "../styles";
import { SectionWrapper } from "../hoc";
import { fadeIn, textVariant } from "../utils/motion";
import { accolades } from "../constants";

const AccoladeCard = ({ index, type, title, issuer, year }) => (
    <motion.div
        variants={fadeIn("", "spring", index * 0.25, 0.75)}
        className="bg-black-200 p-8 rounded-3xl xs:w-[320px] w-full"
    >
        <div className="flex justify-between items-center">
            <span
                className={`text-[12px] font-semibold uppercase tracking-wider ${
                    type === "Award"
                        ? "orange-text-gradient"
                        : "green-text-gradient"
                }`}
            >
                {type}
            </span>
            {year && (
                <span className="text-secondary text-[12px]">{year}</span>
            )}
        </div>

        <h3 className="mt-4 text-white font-bold text-[22px] leading-[28px]">
            {title}
        </h3>
        <p className="mt-2 text-secondary text-[14px]">{issuer}</p>
    </motion.div>
);

const Feedbacks = () => {
    return (
        <div className={`mt-12 bg-black-100 rounded-[20px]`}>
            <div
                className={`bg-tertiary rounded-2xl ${styles.padding} min-h-[300px]`}
            >
                <motion.div variants={textVariant()}>
                    <p className={styles.sectionSubText}>
                        Recognition & credentials
                    </p>
                    <h2 className={styles.sectionHeadText}>
                        Awards & Certifications.
                    </h2>
                </motion.div>
            </div>
            <div
                className={`-mt-20 pb-14 ${styles.paddingX} flex flex-wrap gap-7`}
            >
                {accolades.map((accolade, index) => (
                    <AccoladeCard
                        key={accolade.title}
                        index={index}
                        {...accolade}
                    />
                ))}
            </div>
        </div>
    );
};

export default SectionWrapper(Feedbacks, "");
