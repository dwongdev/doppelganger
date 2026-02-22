

type MaterialIconProps = {
    name: string;
    className?: string;
    fill?: boolean;
};

export default function MaterialIcon({ name, className = '', fill = false }: MaterialIconProps) {
    return (
        <span
            className={`material-symbols-outlined ${className}`}
            style={{
                fontVariationSettings: fill ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
            }}
            aria-hidden="true"
        >
            {name}
        </span>
    );
}
