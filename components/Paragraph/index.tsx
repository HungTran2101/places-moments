import clsx from "clsx";

interface ParagraphProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}
// TODO: This component is currently not used, but it can be used for the description text in the sidebar or for any other text that requires a "frosted glass" effect. The CSS is already set up for a vertical fade effect, but it can be easily modified for a horizontal fade if needed.
const Paragraph = ({ children, style, className }: ParagraphProps) => {
  return (
    <div style={style} className={clsx("marquee", className)}>
      <div className="marquee_blur" aria-hidden="true">
        <p className="marquee_text">{children}</p>
      </div>
      <div className="marquee_clear">
        <p className="marquee_text">{children}</p>
      </div>
    </div>
  );
}

export default Paragraph;