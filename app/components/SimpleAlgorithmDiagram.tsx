import React, { useEffect, useRef, useState } from 'react';
import * as go from 'gojs';

// Simple interfaces for diagram specification
interface DiagramNode {
  key: string;
  type: string;
  text: string;
  details?: string;
  position: { x: number; y: number };
  step?: number;
  properties?: Record<string, any>;
}

interface DiagramLink {
  from: string;
  to: string;
  text?: string;
  type?: string;
  step?: number;
}

interface DiagramStep {
  step_id: number;
  active_nodes: string[];
  active_links: string[];
  description: string;
}

interface DiagramSpecification {
  diagram_type: string;
  nodes: DiagramNode[];
  links: DiagramLink[];
  groups?: any[];
  steps?: DiagramStep[];
}

interface AlgorithmDiagramProps {
  diagramSpec: DiagramSpecification;
  className?: string;
}

// Simple GG Interview theme
const theme = {
  primary: "#20B2AA",   // Teal
  secondary: "#4169E1", // Blue
  accent: "#7FFFD4",    // Light teal
  background: "#121212",
  text: "#FFFFFF",
  nodeColors: {
    process: "#20B2AA",
    decision: "#4169E1",
    data: "#5F9EA0",
    default: "#20B2AA"
  } as Record<string, string>,
};

const SimpleAlgorithmDiagram: React.FC<AlgorithmDiagramProps> = ({ diagramSpec, className }) => {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [totalSteps, setTotalSteps] = useState<number>(1);
  
  // Create the diagram when component mounts
  useEffect(() => {
    if (!diagramRef.current || !diagramSpec) return;
    
    const $ = go.GraphObject.make;
    const diagram = $(go.Diagram, diagramRef.current, {
      initialContentAlignment: go.Spot.Center,
      "undoManager.isEnabled": true,
      layout: $(go.LayeredDigraphLayout, {
        direction: 90,
        layerSpacing: 50,
        columnSpacing: 30
      }),
      "animationManager.isEnabled": true
    });
    
    // Create simple node templates based on node type
    const createNodeTemplate = (shape: string, nodeType: string) => {
      const color = theme.nodeColors[nodeType] || theme.nodeColors.default;
      
      return $(go.Node, "Auto", 
        { locationSpot: go.Spot.Center },
        $(go.Shape, shape, {
          name: "SHAPE",
          fill: color,
          stroke: "white",
          strokeWidth: 1.5
        }),
        $(go.TextBlock, {
          margin: 8,
          font: "12px sans-serif",
          stroke: theme.text,
          textAlign: "center",
          wrap: go.TextBlock.WrapFit
        }, new go.Binding("text")),
        {
          // Simple tooltip
          toolTip: $(go.Adornment, "Auto",
            $(go.Shape, { fill: theme.background }),
            $(go.TextBlock, { margin: 5, stroke: theme.text },
              new go.Binding("text", "details", d => d || "No details available"))
          )
        }
      );
    };
    
    // Add node templates for different types
    diagram.nodeTemplateMap.add("process", createNodeTemplate("Rectangle", "process"));
    diagram.nodeTemplateMap.add("decision", createNodeTemplate("Diamond", "decision"));
    diagram.nodeTemplateMap.add("data", createNodeTemplate("Rectangle", "data"));
    diagram.nodeTemplateMap.add("array_element", createNodeTemplate("Rectangle", "data"));
    diagram.nodeTemplateMap.add("hash_element", createNodeTemplate("RoundedRectangle", "data"));
    diagram.nodeTemplateMap.add("tree_node", createNodeTemplate("Circle", "data"));
    
    // Default for any other node types
    diagram.nodeTemplate = createNodeTemplate("Rectangle", "default");
    
    // Simple link template
    diagram.linkTemplate = $(go.Link,
      { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver, corner: 10 },
      $(go.Shape, { strokeWidth: 1.5, stroke: theme.primary }),
      $(go.Shape, { toArrow: "Standard", fill: theme.primary, stroke: null }),
      $(go.Panel, "Auto",
        { visible: false },
        new go.Binding("visible", "text", t => t ? true : false),
        $(go.Shape, "RoundedRectangle", { fill: theme.background, stroke: theme.primary }),
        $(go.TextBlock, { margin: 3, stroke: theme.text },
          new go.Binding("text"))
      )
    );
    
    // Prepare node data
    const nodeDataArray = diagramSpec.nodes.map(node => ({
      key: node.key,
      text: node.text,
      details: node.details,
      category: node.type,
      loc: `${node.position.x} ${node.position.y}`,
      ...node.properties
    }));
    
    // Prepare link data
    const linkDataArray = diagramSpec.links.map((link, i) => ({
      key: `link${i}`,
      from: link.from,
      to: link.to,
      text: link.text || ""
    }));
    
    // Update model
    diagram.model = new go.GraphLinksModel({
      nodeDataArray: nodeDataArray,
      linkDataArray: linkDataArray,
      nodeKeyProperty: "key",
      linkKeyProperty: "key"
    });
    
    // Handle step changes - closure to maintain reference to diagram
    const handleStepChange = (step: number) => {
      if (!diagramSpec.steps) return;
      
      setCurrentStep(step);
      
      // Find step data
      const stepData = diagramSpec.steps.find(s => s.step_id === step);
      if (!stepData) return;
      
      // Reset all nodes
      diagram.nodes.each(node => {
        const shape = node.findObject("SHAPE");
        if (shape instanceof go.Shape) {
          shape.stroke = "white";
          shape.strokeWidth = 1.5;
        }
      });
      
      // Highlight active nodes
      stepData.active_nodes.forEach(nodeKey => {
        const node = diagram.findNodeForKey(nodeKey);
        if (node) {
          const shape = node.findObject("SHAPE");
          if (shape instanceof go.Shape) {
            shape.stroke = theme.accent;
            shape.strokeWidth = 3;
          }
        }
      });
    };
    
    // Initialize with first step
    if (diagramSpec.steps && diagramSpec.steps.length > 0) {
      setTotalSteps(Math.max(...diagramSpec.steps.map(s => s.step_id)));
      handleStepChange(1);
    }
    
    // Store functions for step navigation in a ref to ensure they're accessible from the component
    const stepHandlers = {
      next: () => handleStepChange(Math.min(totalSteps, currentStep + 1)),
      prev: () => handleStepChange(Math.max(1, currentStep - 1)),
      goTo: (step: number) => handleStepChange(step)
    };
    
    // Attach reference to component
    (window as any).goAlgorithmDiagram = {
      diagram,
      stepHandlers
    };
    
    // Cleanup
    return () => { 
      diagram.div = null;
      delete (window as any).goAlgorithmDiagram;
    };
  }, [diagramSpec, currentStep, totalSteps]);
  
  // Handle step navigation
  const goToNextStep = () => {
    const handlers = (window as any).goAlgorithmDiagram?.stepHandlers;
    if (handlers) handlers.next();
  };
  
  const goToPrevStep = () => {
    const handlers = (window as any).goAlgorithmDiagram?.stepHandlers;
    if (handlers) handlers.prev();
  };
  
  return (
    <div className={`algorithm-diagram ${className || ""}`}>
      <div 
        ref={diagramRef} 
        className="diagram-canvas" 
        style={{ 
          width: "100%", 
          height: "400px", 
          backgroundColor: theme.background,
          borderRadius: "8px" 
        }} 
      />
      
      {diagramSpec && diagramSpec.steps && (
        <div className="diagram-controls flex flex-col gap-2 mt-4">
          <div className="step-description p-2 bg-black/50 rounded">
            {diagramSpec.steps.find(s => s.step_id === currentStep)?.description || ""}
          </div>
          
          <div className="flex justify-between items-center">
            <button 
              onClick={goToPrevStep}
              disabled={currentStep <= 1}
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Previous
            </button>
            
            <div className="text-sm">
              Step {currentStep} of {totalSteps}
            </div>
            
            <button 
              onClick={goToNextStep}
              disabled={currentStep >= totalSteps}
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleAlgorithmDiagram;
