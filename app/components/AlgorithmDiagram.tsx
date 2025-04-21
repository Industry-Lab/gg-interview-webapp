import React, { useEffect, useRef, useState } from 'react';
import * as go from 'gojs';

// Interfaces for diagram specification
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

interface DiagramGroup {
  key: string;
  type: string;
  text: string;
  members: string[];
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
  groups?: DiagramGroup[];
  steps?: DiagramStep[];
}

interface AlgorithmDiagramProps {
  diagramSpec: DiagramSpecification;
  className?: string;
}

// Simple theme with GG Interview brand colors
const simpleTheme = {
  // Base colors
  primary: "#20B2AA",      // Teal
  secondary: "#4169E1",    // Blue
  accent: "#7FFFD4",       // Light teal
  background: "#121212",
  text: "#FFFFFF",
  
  // Node colors based on type
  nodeColors: {
    process: "#20B2AA",
    decision: "#4169E1",
    data: "#5F9EA0",
    array_element: "#5F9EA0",
    hash_element: "#7B68EE",
    tree_node: "#48D1CC",
    default: "#20B2AA"
  } as Record<string, string>,
};

const AlgorithmDiagram: React.FC<AlgorithmDiagramProps> = ({ diagramSpec, className }) => {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [diagram, setDiagram] = useState<go.Diagram | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [totalSteps, setTotalSteps] = useState<number>(1);
  
  // Define TypeScript interfaces for GoJS types
  interface GoJSNode extends go.Node {
    findObject(name: string): go.GraphObject | null;
  }
  
  interface GoJSLink extends go.Link {
    findObject(name: string): go.GraphObject | null;
  }
  
  // Initialize the diagram when the component mounts
  useEffect(() => {
    if (!diagramRef.current) return;
    
    // Create a new diagram
    const $ = go.GraphObject.make;
    const myDiagram = $(go.Diagram, diagramRef.current, {
      initialContentAlignment: go.Spot.Center,
      "undoManager.isEnabled": true,
      layout: $(go.LayeredDigraphLayout, {
        direction: 90,
        layerSpacing: 60,
        columnSpacing: 30,
        setsPortSpots: false
      }),
      maxSelectionCount: 1,
      "animationManager.isEnabled": true,
      model: $(go.GraphLinksModel, {
        linkKeyProperty: "key",
        nodeKeyProperty: "key"
      })
    });
    
    // Create node templates for all node types
    const createNodeTemplate = (shape: string, nodeType: string, width: number, height: number) => {
      return $(go.Node, "Auto",
        { locationSpot: go.Spot.Center },
        $(go.Shape, shape,
          {
            name: "SHAPE",
            fill: simpleTheme.nodeColors[nodeType] || simpleTheme.nodeColors.default,
            stroke: "white",
            strokeWidth: 1.5,
            portId: "",
            width: width,
            height: height
          }),
        $(go.TextBlock,
          {
            margin: 5,
            font: "12px sans-serif",
            stroke: simpleTheme.text,
            textAlign: "center",
            wrap: go.TextBlock.WrapFit
          },
          new go.Binding("text")),
        {
          // Simple tooltip for node details
          toolTip: $(go.Adornment, "Auto",
            $(go.Shape, { fill: "#1c1c1c" }),
            $(go.TextBlock, { margin: 5, stroke: "white" },
              new go.Binding("text", "details", (d) => d || "No details available"))
          )
        }
      );
    };
    
    // Add all node templates
    myDiagram.nodeTemplateMap.add("process", createNodeTemplate("Rectangle", "process", 150, 50));
    myDiagram.nodeTemplateMap.add("decision", createNodeTemplate("Diamond", "decision", 120, 70));
    myDiagram.nodeTemplateMap.add("data", createNodeTemplate("Rectangle", "data", 100, 40));
    myDiagram.nodeTemplateMap.add("array_element", createNodeTemplate("Rectangle", "array_element", 120, 50));
    myDiagram.nodeTemplateMap.add("hash_element", createNodeTemplate("RoundedRectangle", "hash_element", 120, 50));
    myDiagram.nodeTemplateMap.add("tree_node", createNodeTemplate("Circle", "tree_node", 50, 50));
    
    // Create default node template
    myDiagram.nodeTemplate =
      $(go.Node, "Auto",
        {
          locationSpot: go.Spot.Center,
          selectionAdorned: false,
          mouseEnter: (e, node) => {
            const goNode = node as GoJSNode;
            const shape = goNode.findObject("SHAPE");
            if (shape instanceof go.Shape) shape.stroke = simpleTheme.accent;
          },
          mouseLeave: (e, node) => {
            const goNode = node as GoJSNode;
            const shape = goNode.findObject("SHAPE");
            if (shape instanceof go.Shape) shape.stroke = "white";
          }
        },
        $(go.Shape, "Rectangle",
          {
            name: "SHAPE",
            fill: simpleTheme.nodeColors.default,
            stroke: "white",
            strokeWidth: 2,
            portId: "",
            fromLinkable: true,
            toLinkable: true,
            cursor: "pointer"
          }),
        $(go.TextBlock,
          {
            margin: 8,
            editable: false,
            font: "bold 12px sans-serif",
            stroke: simpleTheme.text,
            wrap: go.TextBlock.WrapFit,
            textAlign: "center"
          },
          new go.Binding("text"))
      );
    
    // Create link template
    myDiagram.linkTemplate =
      $(go.Link,
        {
          routing: go.Link.AvoidsNodes,
          curve: go.Link.JumpOver,
          corner: 10,
          toShortLength: 4,
          selectable: false,
          mouseEnter: (e, link) => {
            const goLink = link as GoJSLink;
            const highlight = goLink.findObject("HIGHLIGHT");
            if (highlight instanceof go.Shape) highlight.stroke = simpleTheme.accent;
          },
          mouseLeave: (e, link) => {
            const goLink = link as GoJSLink;
            const highlight = goLink.findObject("HIGHLIGHT");
            if (highlight instanceof go.Shape) highlight.stroke = "transparent";
          }
        },
        $(go.Shape, { strokeWidth: 2, stroke: simpleTheme.primary }),
        $(go.Shape, { toArrow: "Standard", fill: simpleTheme.primary, stroke: null }),
        $(go.Shape, { name: "HIGHLIGHT", strokeWidth: 5, stroke: "transparent", geometryString: "M0 0 L1 0", segmentIndex: -1 }),
        $(go.Panel, "Auto",
          $(go.Shape, "RoundedRectangle", { fill: simpleTheme.background, stroke: simpleTheme.primary }),
          $(go.TextBlock, 
            {
              margin: 4,
              font: "10px sans-serif",
              stroke: simpleTheme.text
            },
            new go.Binding("text", "text"))
        )
      );
    
    // Create group template
    myDiagram.groupTemplate =
      $(go.Group, "Auto",
        {
          layout: $(go.LayeredDigraphLayout, {
            direction: 90,
            layerSpacing: 40,
            columnSpacing: 20
          }),
          background: "transparent"
        },
        $(go.Shape, "Rectangle",
          {
            fill: "rgba(32, 178, 170, 0.1)",
            stroke: simpleTheme.primary,
            strokeWidth: 2,
            strokeDashArray: [4, 4]
          }),
        $(go.Panel, "Vertical",
          { defaultAlignment: go.Spot.Left },
          $(go.TextBlock,
            {
              font: "bold 12px sans-serif",
              margin: new go.Margin(5, 5, 0, 5),
              stroke: simpleTheme.primary,
              isMultiline: false,
              editable: false
            },
            new go.Binding("text")),
          $(go.Placeholder, { padding: 10 })
        )
      );
    
    setDiagram(myDiagram);
    
    // Cleanup function
    return () => {
      myDiagram.div = null;
    };
  }, []);
  
  // Update the diagram when the specification changes
  useEffect(() => {
    if (!diagram || !diagramSpec) return;
    
    // Calculate total steps
    let maxStep = 1;
    if (diagramSpec.steps && diagramSpec.steps.length > 0) {
      maxStep = Math.max(...diagramSpec.steps.map(step => step.step_id));
    }
    setTotalSteps(maxStep);
    
    // Create node data array from specification
    const nodeDataArray = diagramSpec.nodes.map(node => ({
      key: node.key,
      text: node.text,
      category: node.type,
      loc: `${node.position.x} ${node.position.y}`,
      ...node.properties,
      step: node.step || 1
    }));
    
    // Create link data array from specification
    const linkDataArray = diagramSpec.links.map((link, i) => ({
      key: `link${i}`,
      from: link.from,
      to: link.to,
      text: link.text || "",
      step: link.step || 1
    }));
    
    // Create group data array from specification
    const groupDataArray = diagramSpec.groups ? diagramSpec.groups.map(group => ({
      key: group.key,
      text: group.text,
      isGroup: true,
      memberKeys: group.members
    })) : [];
    
    // Update the model with proper type handling
    // Create separate model for node data and link data
    const nodeData = nodeDataArray.map(node => ({
      ...node,
      // Default values for required fields when using with groups
      step: node.step || 1,
      category: node.category || "default"
    }));
    
    // Create group data with the required fields
    const groupData = groupDataArray.map(group => ({
      ...group,
      isGroup: true,
      category: "group", // Set category for all groups
      step: 1, // Default step
      loc: "0 0" // Default location
    }));
    
    // Create the model with proper typing
    diagram.model = new go.GraphLinksModel({
      nodeDataArray: [...nodeData, ...groupData],
      linkDataArray: linkDataArray,
      linkKeyProperty: "key",
      nodeKeyProperty: "key",
      nodeCategoryProperty: "category"
    });
    
    // Apply groups
    if (diagramSpec.groups) {
      diagramSpec.groups.forEach(group => {
        group.members.forEach(memberKey => {
          const node = diagram.findNodeForKey(memberKey);
          if (node) {
            node.containingGroup = diagram.findNodeForKey(group.key) as go.Group;
          }
        });
      });
    }
    
    diagram.layoutDiagram(true);
    
    // Set initial step
    handleStepChange(1);
  }, [diagram, diagramSpec]);
  
  // Function to handle step changes
  const handleStepChange = (step: number) => {
    if (!diagram || !diagramSpec || !diagramSpec.steps) return;
    
    setCurrentStep(step);
    
    // Find the corresponding step in the specification
    const currentStepData = diagramSpec.steps.find(s => s.step_id === step);
    if (!currentStepData) return;
    
    // Highlight active nodes and links
    diagram.nodes.each(node => {
      const goNode = node as GoJSNode;
      const shape = goNode.findObject("SHAPE");
      if (shape && shape instanceof go.Shape) {
        if (currentStepData.active_nodes.includes(node.key as string)) {
          shape.stroke = simpleTheme.accent;
          shape.strokeWidth = 3;
        } else {
          shape.stroke = "white";
          shape.strokeWidth = 2;
        }
      }
    });
    
    diagram.links.each(link => {
      const goLink = link as GoJSLink;
      const highlight = goLink.findObject("HIGHLIGHT");
      if (highlight && highlight instanceof go.Shape) {
        if (currentStepData.active_links.includes(link.key as string)) {
          highlight.stroke = simpleTheme.accent;
        } else {
          highlight.stroke = "transparent";
        }
      }
    });
  };
  
  return (
    <div className={`algorithm-diagram ${className || ""}`}>
      <div 
        ref={diagramRef} 
        className="diagram-canvas" 
        style={{ 
          width: "100%", 
          height: "400px", 
          backgroundColor: simpleTheme.background,
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
              onClick={() => handleStepChange(Math.max(1, currentStep - 1))}
              disabled={currentStep <= 1}
              className={`px-3 py-1 bg-teal-600 text-white rounded ${currentStep <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-500'}`}
            >
              Previous
            </button>
            
            <span className="text-white">
              Step {currentStep} of {totalSteps}
            </span>
            
            <button 
              onClick={() => handleStepChange(Math.min(totalSteps, currentStep + 1))}
              disabled={currentStep >= totalSteps}
              className={`px-3 py-1 bg-blue-600 text-white rounded ${currentStep >= totalSteps ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500'}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlgorithmDiagram;
