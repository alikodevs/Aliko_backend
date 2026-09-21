import React, { type ReactNode } from "react";

export interface CardAction {
  label: ReactNode;
  onClick: () => void;
  className?: string;
}

export interface CardProps {
  img?: string;
  title?: string;
  style?: React.CSSProperties;
  content?: string;
  className?: string;
  actions?: CardAction[];
  imgClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  actionsClassName?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  children?: ReactNode;
}

export default function Card({
  img,
  title,
  style,
  content,
  className,
  actions,
  imgClassName,
  titleClassName,
  contentClassName,
  actionsClassName,
  onMouseEnter,
  onMouseLeave,
  onClick,
  children,
}: CardProps) {
  return (
    <div
      className={className}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {img && <img src={img} alt={title} className={imgClassName} />}
      {title && <h5 className={titleClassName}>{title}</h5>}
      {content && <p className={contentClassName}>{content}</p>}
      {children}
      {actions && actions.length === 1 && (
        <button className={actions[0]?.className} onClick={actions[0]?.onClick}>
          {actions[0].label}
        </button>
      )}
      {actions && actions.length > 1 && (
        <div className={actionsClassName}>
          {actions.map((action: any, index: number) => (
            <button
              key={index}
              className={action?.className}
              onClick={action?.onClick}
            >
              {action?.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
