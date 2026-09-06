export function NivoMark({ size = 38 }: { size?: number }) {
  return (
    <img
      className="nivo-mark"
      width={size}
      height={size}
      src={`${import.meta.env.BASE_URL}nivo-symbol.svg`}
      alt=""
    />
  );
}

export function NivoLogo({ markSize = 38 }: { markSize?: number }) {
  return (
    <span className="nivo-logo" aria-hidden="true">
      <NivoMark size={markSize} />
      <img className="nivo-wordmark" src={`${import.meta.env.BASE_URL}nivo-wordmark.svg`} alt="" />
    </span>
  );
}
