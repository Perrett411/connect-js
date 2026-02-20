import { QuantumConsensusFunction } from "./consensus";
import type { NodeCircuit } from "./consensus";

describe("QuantumConsensusFunction", () => {
  describe("constructor", () => {
    it("initialises with default min/max nodes", () => {
      const qcf = new QuantumConsensusFunction();
      expect(qcf.nodeRange).toEqual([8, 64]);
      expect(qcf.activeNodes).toBe(8);
    });

    it("initialises with custom min/max nodes", () => {
      const qcf = new QuantumConsensusFunction(4, 32);
      expect(qcf.nodeRange).toEqual([4, 32]);
      expect(qcf.activeNodes).toBe(4);
    });

    it("sets coherenceTime and superpositionAngle", () => {
      const qcf = new QuantumConsensusFunction();
      expect(qcf.coherenceTime).toBeCloseTo(1e-9);
      expect(qcf.superpositionAngle).toBeCloseTo(Math.PI / 2);
    });
  });

  describe("adjustNodes", () => {
    it("scales activeNodes based on load factor", async () => {
      const qcf = new QuantumConsensusFunction(8, 64);
      const nodes = await qcf.adjustNodes(50, 100);
      // loadFactor = 0.5, so activeNodes = round(64 * 0.5) = 32
      expect(nodes).toBe(32);
      expect(qcf.activeNodes).toBe(32);
    });

    it("clamps to minimum when load is very low", async () => {
      const qcf = new QuantumConsensusFunction(8, 64);
      const nodes = await qcf.adjustNodes(0, 100);
      expect(nodes).toBe(8);
      expect(qcf.activeNodes).toBe(8);
    });

    it("clamps to maximum when load equals maxLoad", async () => {
      const qcf = new QuantumConsensusFunction(8, 64);
      const nodes = await qcf.adjustNodes(100, 100);
      expect(nodes).toBe(64);
      expect(qcf.activeNodes).toBe(64);
    });
  });

  describe("entangleNodes", () => {
    it("creates a circuit with phases for all active nodes", async () => {
      const qcf = new QuantumConsensusFunction(4, 64);
      qcf.activeNodes = 4;
      const circuit = await qcf.entangleNodes([]);
      expect(circuit.nodes).toBe(4);
      expect(circuit.phases).toHaveLength(4);
    });

    it("first phase is on qubit 0 with the full superposition angle", async () => {
      const qcf = new QuantumConsensusFunction(8, 64);
      const circuit = await qcf.entangleNodes([]);
      const first = circuit.phases[0]!;
      expect(first.qubit).toBe(0);
      expect(first.phase).toBeCloseTo(Math.PI / 2);
      expect(first.controlledBy).toBeUndefined();
    });

    it("subsequent phases are controlled by qubit 0 with dynamic adjustment", async () => {
      const qcf = new QuantumConsensusFunction(8, 64);
      qcf.activeNodes = 4;
      const circuit = await qcf.entangleNodes([]);
      for (let i = 1; i < circuit.phases.length; i++) {
        const phase = circuit.phases[i]!;
        expect(phase.controlledBy).toBe(0);
        expect(phase.phase).toBeCloseTo(
          qcf.superpositionAngle * (i / qcf.activeNodes)
        );
      }
    });
  });

  describe("validateConsensus", () => {
    it("returns false for an empty circuit", async () => {
      const qcf = new QuantumConsensusFunction();
      const circuit: NodeCircuit = { nodes: 0, phases: [] };
      expect(await qcf.validateConsensus(circuit)).toBe(false);
    });

    it("returns true when all node probabilities are positive", async () => {
      const qcf = new QuantumConsensusFunction(8, 64);
      const circuit = await qcf.entangleNodes([]);
      expect(await qcf.validateConsensus(circuit)).toBe(true);
    });
  });
});
