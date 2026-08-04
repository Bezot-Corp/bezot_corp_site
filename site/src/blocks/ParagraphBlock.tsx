type Props = {
  props?: Record<string, unknown>;
};

export function ParagraphBlock({ props }: Props) {
  const text = typeof props?.text === "string" ? props.text : "";

  return (
    <section>
      <p>{text}</p>
    </section>
  );
}
