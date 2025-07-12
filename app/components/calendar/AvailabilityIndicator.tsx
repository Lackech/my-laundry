import { cn } from "~/lib/utils";

interface AvailabilityIndicatorProps {
  availability: number; // 0-100 percentage
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  className?: string;
}

export default function AvailabilityIndicator({
  availability,
  size = "md",
  showPercentage = false,
  className,
}: AvailabilityIndicatorProps) {
  // Normalize availability to 0-100 range
  const normalizedAvailability = Math.max(0, Math.min(100, availability));

  // Determine color based on availability percentage
  const getAvailabilityColor = (percentage: number) => {
    if (percentage >= 75) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    if (percentage >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const getAvailabilityText = (percentage: number) => {
    if (percentage >= 75) return "High availability";
    if (percentage >= 50) return "Moderate availability";
    if (percentage >= 25) return "Low availability";
    return "Very low availability";
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-2 text-xs";
      case "lg":
        return "h-4 text-base";
      default:
        return "h-3 text-sm";
    }
  };

  const colorClass = getAvailabilityColor(normalizedAvailability);
  const sizeClasses = getSizeClasses();

  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-gray-200",
          sizeClasses
        )}
        title={`${Math.round(
          normalizedAvailability
        )}% available - ${getAvailabilityText(normalizedAvailability)}`}
      >
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out",
            colorClass
          )}
          style={{ width: `${normalizedAvailability}%` }}
        />
      </div>

      {/* Percentage Text */}
      {showPercentage && (
        <div className={cn("mt-1 font-medium text-gray-700", sizeClasses)}>
          {Math.round(normalizedAvailability)}% available
        </div>
      )}
    </div>
  );
}

// Alternative dot indicator for compact spaces
export function AvailabilityDot({
  availability,
  size = "md",
  className,
}: {
  availability: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const normalizedAvailability = Math.max(0, Math.min(100, availability));

  const getAvailabilityColor = (percentage: number) => {
    if (percentage >= 75) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    if (percentage >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "w-2 h-2";
      case "lg":
        return "w-4 h-4";
      default:
        return "w-3 h-3";
    }
  };

  const colorClass = getAvailabilityColor(normalizedAvailability);
  const sizeClasses = getSizeClasses();

  return (
    <div
      className={cn("rounded-full", colorClass, sizeClasses, className)}
      title={`${Math.round(normalizedAvailability)}% available`}
    />
  );
}

// Text-based availability indicator
export function AvailabilityText({
  availability,
  size = "md",
  className,
}: {
  availability: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const normalizedAvailability = Math.max(0, Math.min(100, availability));

  const getAvailabilityStatus = (percentage: number) => {
    if (percentage >= 75) return { text: "Available", color: "text-green-600" };
    if (percentage >= 50) return { text: "Moderate", color: "text-yellow-600" };
    if (percentage >= 25) return { text: "Limited", color: "text-orange-600" };
    return { text: "Busy", color: "text-red-600" };
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-xs";
      case "lg":
        return "text-base";
      default:
        return "text-sm";
    }
  };

  const status = getAvailabilityStatus(normalizedAvailability);
  const sizeClasses = getSizeClasses();

  return (
    <span
      className={cn("font-medium", status.color, sizeClasses, className)}
      title={`${Math.round(normalizedAvailability)}% available`}
    >
      {status.text}
    </span>
  );
}

// Badge-style availability indicator
export function AvailabilityBadge({
  availability,
  size = "md",
  className,
}: {
  availability: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const normalizedAvailability = Math.max(0, Math.min(100, availability));

  const getAvailabilityStatus = (percentage: number) => {
    if (percentage >= 75)
      return {
        text: "Available",
        color: "bg-green-100 text-green-800 border-green-200",
      };
    if (percentage >= 50)
      return {
        text: "Moderate",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    if (percentage >= 25)
      return {
        text: "Limited",
        color: "bg-orange-100 text-orange-800 border-orange-200",
      };
    return { text: "Busy", color: "bg-red-100 text-red-800 border-red-200" };
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-2 py-1 text-xs";
      case "lg":
        return "px-3 py-2 text-base";
      default:
        return "px-2.5 py-1.5 text-sm";
    }
  };

  const status = getAvailabilityStatus(normalizedAvailability);
  const sizeClasses = getSizeClasses();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        status.color,
        sizeClasses,
        className
      )}
      title={`${Math.round(normalizedAvailability)}% available`}
    >
      {status.text}
    </span>
  );
}
