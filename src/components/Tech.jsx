import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload, useTexture } from "@react-three/drei";
import { Decal, Float } from "@react-three/drei";

import CanvasLoader from "./Loader";
import { SectionWrapper } from "../hoc";
import { technologies } from "../constants";

const SingleBall = ({ imgUrl, position }) => {
    const [decal] = useTexture([imgUrl]);

    return (
        <Float speed={1.75} rotationIntensity={1} floatIntensity={2}>
            <mesh position={position} castShadow receiveShadow scale={1.1}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial
                    color="#fff8eb"
                    polygonOffset
                    polygonOffsetFactor={-5}
                    flatShading
                />
                <Decal
                    position={[0, 0, 1]}
                    rotation={[2 * Math.PI, 0, 6.25]}
                    scale={1}
                    map={decal}
                    flatShading
                />
            </mesh>
        </Float>
    );
};

const TechScene = () => {
    const perRow = 6;
    const spacing = 2.6;

    const items = useMemo(() => {
        return technologies.map((tech, i) => {
            const row = Math.floor(i / perRow);
            const col = i % perRow;
            const rowCount = Math.min(
                perRow,
                technologies.length - row * perRow
            );
            const x = (col - (rowCount - 1) / 2) * spacing;
            const totalRows = Math.ceil(technologies.length / perRow);
            const y = ((totalRows - 1) / 2 - row) * spacing;
            return { ...tech, position: [x, y, 0] };
        });
    }, []);

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[0, 0, 5]} intensity={1} />
            {items.map((tech) => (
                <SingleBall
                    key={tech.name}
                    imgUrl={tech.icon}
                    position={tech.position}
                />
            ))}
        </>
    );
};

const Tech = () => {
    const totalRows = Math.ceil(technologies.length / 6);

    return (
        <div className="w-full" style={{ height: `${totalRows * 130 + 60}px` }}>
            <Canvas
                frameloop="always"
                dpr={[1, 2]}
                camera={{ position: [0, 0, 18], fov: 50 }}
                gl={{ preserveDrawingBuffer: true }}
            >
                <Suspense fallback={<CanvasLoader />}>
                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        maxPolarAngle={Math.PI / 2}
                        minPolarAngle={Math.PI / 2}
                    />
                    <TechScene />
                </Suspense>
                <Preload all />
            </Canvas>
        </div>
    );
};

export default SectionWrapper(Tech, "");
