import type { MatrixOperation } from "@/types/matrix";

type OperationOption = {
  id: MatrixOperation;
  label: string;
};

type OperationButtonGroupProps = {
  options: OperationOption[];
  active: MatrixOperation;
  onChange: (next: MatrixOperation) => void;
};

export function OperationButtonGroup({
  options,
  active,
  onChange,
}: OperationButtonGroupProps) {
  return (
    <div className="operation-pill-group">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`operation-pill ${active === option.id ? "operation-pill-active" : ""}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

