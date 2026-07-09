import type { LoanForm as LoanFormType } from "../App";

interface WhatIfSimulatorProps {
  simulatorData: LoanFormType;
  updateSimulatorField: (name: keyof LoanFormType, value: string) => void;
  isSimulating: boolean;
  formatMoney: (value: number) => string;
}

export default function WhatIfSimulator({
  simulatorData,
  updateSimulatorField,
  isSimulating,
  formatMoney,
}: WhatIfSimulatorProps) {
  return (
    <section className="panel simulator-panel">
      <div className="panel-header">
        <div>
          <h3>What-If Simulator</h3>
          <p>
            Adjust key factors to see how the model output changes.
            {isSimulating ? " Updating..." : ""}
          </p>
        </div>
      </div>

      <div className="simulator-grid">
        <label className="slider-field">
          <span>
            Annual Income <strong>{formatMoney(simulatorData.person_income)}</strong>
          </span>
          <input
            type="range"
            min="20000"
            max="250000"
            step="1000"
            value={simulatorData.person_income}
            onChange={(event) => updateSimulatorField("person_income", event.target.value)}
          />
        </label>

        <label className="slider-field">
          <span>
            Loan Amount <strong>{formatMoney(simulatorData.loan_amnt)}</strong>
          </span>
          <input
            type="range"
            min="1000"
            max="50000"
            step="500"
            value={simulatorData.loan_amnt}
            onChange={(event) => updateSimulatorField("loan_amnt", event.target.value)}
          />
        </label>

        <label className="slider-field">
          <span>
            Interest Rate <strong>{simulatorData.loan_int_rate.toFixed(2)}%</strong>
          </span>
          <input
            type="range"
            min="3"
            max="30"
            step="0.25"
            value={simulatorData.loan_int_rate}
            onChange={(event) => updateSimulatorField("loan_int_rate", event.target.value)}
          />
        </label>

        <label className="slider-field">
          <span>
            Credit Score <strong>{simulatorData.credit_score}</strong>
          </span>
          <input
            type="range"
            min="300"
            max="850"
            step="5"
            value={simulatorData.credit_score}
            onChange={(event) => updateSimulatorField("credit_score", event.target.value)}
          />
        </label>

        <label className="slider-field">
          <span>
            Employment <strong>{simulatorData.person_emp_exp} years</strong>
          </span>
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={simulatorData.person_emp_exp}
            onChange={(event) => updateSimulatorField("person_emp_exp", event.target.value)}
          />
        </label>
      </div>
    </section>
  );
}