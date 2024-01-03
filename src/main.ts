import { readFileSync, createWriteStream } from "fs";

abstract class Graphe {
  private nomFichier: string;
  private _listeAdjacence: Map<number, { destination: number; poids: number }[]>;

  constructor(nomFichier?: string) {
    this.nomFichier = nomFichier ?? "";
    this._listeAdjacence = new Map<number, { destination: number; poids: number }[]>();
  }

  get listeAdjacence(): Map<number, { destination: number; poids: number }[]> {
    return this._listeAdjacence;
  }

  set listeAdjacence(listeAdjacence: Map<number, { destination: number; poids: number }[]>) {
    this._listeAdjacence = listeAdjacence;
  }

  abstract ajoutArc(sommetorigine: number, sommetDestination: number, poids: number): void;

  getSommetId(sommet: string): number {
    const sommetId = parseInt(sommet);
    return sommetId;
  }

  afficheGraph(): void {
    for (const [sommet, arcs] of this.listeAdjacence) {
      let arcsStr = arcs.map((arc) => `${arc.destination} (poids=${arc.poids})`).join(" ");
      console.log(`Sommet ${sommet} reliÃ© Ã : ${arcsStr}`);
    }
  }

  enregistrementFichier(nomFichier: string): void {
    let nbArcs = 0;
    for (const [, arcs] of this.listeAdjacence) {
      nbArcs += arcs.length;
    }
    let output = createWriteStream(`src/DAG/${nomFichier}.gr`);
    output.write(`${this.listeAdjacence.size} ${nbArcs}\n`);
    for (const [sommet, arcs] of this.listeAdjacence) {
      for (const arc of arcs) {
        output.write(`${sommet} ${arc.destination} ${arc.poids}\n`);
      }
    }
    output.end();
  }
}

class GrapheOriente extends Graphe {
  constructor(nomFichier?: string) {
    super();
    if (nomFichier) {
      let lignes = readFileSync(nomFichier, "utf8").split("\n");
      if (lignes.length > 1) {
        const [, ...arcsLines] = lignes; //on divise la ligne qui contient nb sommets et nb arcs du reste

        for (let i = 0; i < arcsLines.length - 1; i++) {
          //chaque fichier a une ligne vide de trop Ã  la fin donc -1 sinon ca donnera un NaN
          const arcLine = arcsLines[i];
          const [origine, destination, poids] = arcLine.split(" ");
          const origineSommet = this.getSommetId(origine);
          const destinationSommet = this.getSommetId(destination);
          const poidsArc = parseInt(poids);

          this.ajoutArc(origineSommet, destinationSommet, poidsArc);
        }
      }
    }
  }

  ajoutArc(origineSommet: number, destinationSommet: number, poids: number): void {
    if (!this.listeAdjacence.has(origineSommet)) {
      //s'il n'y a pas deja on l'ajoute
      this.listeAdjacence.set(origineSommet, []);
    }
    this.listeAdjacence.get(origineSommet)!.push({ destination: destinationSommet, poids: poids });
  }
}

class DAG extends GrapheOriente {
  constructor(nomfichier?: string) {
    super(nomfichier);
  }
  getPoids(origine: number, destination: number): number {
    const arcs = this.listeAdjacence.get(origine);
    if (arcs) {
      const arc = arcs.find((a) => a.destination === destination);
      if (arc) {
        return arc.poids;
      }
    }
    return 0;
  }

  getSucc(): Map<number, number[]> {
    const Succ: Map<number, number[]> = new Map<number, number[]>();
    for (const [sommet, arcs] of this.listeAdjacence) {
      const destinations: number[] = [];
      for (const arc of arcs) {
        destinations.push(arc.destination);
      }
      Succ.set(sommet, destinations);
    }
    return Succ;
  }

  getPred(): Map<number, number[]> {
    const Pred = new Map<number, number[]>();
    for (const [sommet, arcs] of this.listeAdjacence) {
      for (const arc of arcs) {
        const destination = arc.destination;
        if (!Pred.has(destination)) {
          Pred.set(destination, []);
        }
        Pred.get(destination)!.push(sommet);
      }
    }
    return Pred;
  }

  triTopologique(): number[] {
    const Pred = this.getPred();

    const sommetsDansPred = Array.from(Pred.keys());
    const sommetsDansListeAdjacence = Array.from(this.listeAdjacence.keys());
    let listeTriee: number[] = sommetsDansListeAdjacence.filter(
      (sommet) => !sommetsDansPred.includes(sommet)
    );

    let i = 0;
    while (i < listeTriee.length) {
      Pred.forEach((tabPred: number[]) => {
        const index = tabPred.indexOf(listeTriee[i]);
        if (index !== -1) {
          tabPred.splice(index, 1);
        }
      });
      for (const [sommet] of Pred) {
        if (Pred.get(sommet)!.length === 0) {
          listeTriee.push(sommet);
          Pred.delete(sommet);
        }
      }
      i++;
    }
    return listeTriee;
  }

  bellmanMin(racine: number): [string, string, string] {
    const grapheTopo = this.triTopologique();
    const peresSommet = new Map<number, number | null>();
    const potentielSommet = new Map<number, number>();

    for (let i = 0; i < grapheTopo.length; i++) {
      const sommet = grapheTopo[i];
      if (sommet === racine) {
        potentielSommet.set(racine, 0);
        peresSommet.set(racine, null);
      } else {
        potentielSommet.set(sommet, Infinity);
        peresSommet.set(sommet, sommet);
        const predSommetGrapheTopo = this.getPred().get(sommet);
        if (predSommetGrapheTopo !== undefined) {
          for (let l = 0; l < predSommetGrapheTopo.length; l++) {
            const pred = predSommetGrapheTopo[l];
            if (
              potentielSommet.get(sommet)! >
              potentielSommet.get(pred)! + this.getPoids(pred, sommet)
            ) {
              potentielSommet.set(sommet, potentielSommet.get(pred)! + this.getPoids(pred, sommet));
              peresSommet.set(sommet, pred);
            }
          }
        }
      }
    }

    const sommets = Array.from(peresSommet.keys())
      .map((s) => s.toString().padStart(10))
      .join(" ");
    const potentiels = Array.from(potentielSommet.values())
      .map((pi) => pi.toString().padStart(10))
      .join(" ");
    const peres = Array.from(peresSommet.values())
      .map((p) => (p === null ? "None".padStart(10) : p.toString().padStart(10)))
      .join(" ");

    return [sommets, potentiels, peres];
  }

  bellmanMax(racine: number): [string, string, string] {
    const grapheTopo = this.triTopologique();
    const peresSommet = new Map<number, number | null>();
    const potentielSommet = new Map<number, number>();

    for (let i = 0; i < grapheTopo.length; i++) {
      const sommet = grapheTopo[i];
      if (sommet === racine) {
        potentielSommet.set(racine, 0);
        peresSommet.set(racine, null);
      } else {
        potentielSommet.set(sommet, -Infinity);
        peresSommet.set(sommet, sommet);
        const predSommetGrapheTopo = this.getPred().get(sommet);
        if (predSommetGrapheTopo !== undefined) {
          for (let l = 0; l < predSommetGrapheTopo.length; l++) {
            const pred = predSommetGrapheTopo[l];
            if (
              potentielSommet.get(sommet)! <
              potentielSommet.get(pred)! + this.getPoids(pred, sommet)
            ) {
              potentielSommet.set(sommet, potentielSommet.get(pred)! + this.getPoids(pred, sommet));
              peresSommet.set(sommet, pred);
            }
          }
        }
      }
    }

    const sommets = Array.from(peresSommet.keys())
      .map((s) => s.toString().padStart(10))
      .join(" ");
    const potentiels = Array.from(potentielSommet.values())
      .map((pi) => pi.toString().padStart(10))
      .join(" ");
    const peres = Array.from(peresSommet.values())
      .map((p) => (p === null ? "None".padStart(10) : p.toString().padStart(10)))
      .join(" ");

    return [sommets, potentiels, peres];
  }

  bellmanAntiMin(racine: number): [string, string, string] {
    const grapheTopo = this.triTopologique().reverse();
    const peresSommet = new Map<number, number | null>();
    const potentielSommet = new Map<number, number>();

    for (let i = 0; i < grapheTopo.length; i++) {
      const sommet = grapheTopo[i];
      if (sommet === racine) {
        potentielSommet.set(racine, 0);
        peresSommet.set(racine, null);
      } else {
        potentielSommet.set(sommet, Infinity);
        peresSommet.set(sommet, sommet);
        const succSommetGrapheTopo = this.getSucc().get(sommet);
        if (succSommetGrapheTopo !== undefined) {
          for (let l = 0; l < succSommetGrapheTopo.length; l++) {
            const succ = succSommetGrapheTopo[l];
            if (
              potentielSommet.get(sommet)! >
              potentielSommet.get(succ)! + this.getPoids(sommet, succ)
            ) {
              potentielSommet.set(sommet, potentielSommet.get(succ)! + this.getPoids(sommet, succ));
              peresSommet.set(sommet, succ);
            }
          }
        }
      }
    }

    const sommets = Array.from(peresSommet.keys())
      .map((s) => s.toString().padStart(10))
      .reverse()
      .join(" ");
    const potentiels = Array.from(potentielSommet.values())
      .map((pi) => pi.toString().padStart(10))
      .reverse()
      .join(" ");
    const peres = Array.from(peresSommet.values())
      .map((p) => (p === null ? "None".padStart(10) : p.toString().padStart(10)))
      .reverse()
      .join(" ");

    return [sommets, potentiels, peres];
  }

  bellmanAntiMax(racine: number): [string, string, string] {
    const grapheTopo = this.triTopologique().reverse();
    const peresSommet = new Map<number, number | null>();
    const potentielSommet = new Map<number, number>();

    for (let i = 0; i < grapheTopo.length; i++) {
      const sommet = grapheTopo[i];
      if (sommet === racine) {
        potentielSommet.set(racine, 0);
        peresSommet.set(racine, null);
      } else {
        potentielSommet.set(sommet, -Infinity);
        peresSommet.set(sommet, sommet);
        const succSommetGrapheTopo = this.getSucc().get(sommet);
        if (succSommetGrapheTopo !== undefined) {
          for (let l = 0; l < succSommetGrapheTopo.length; l++) {
            const succ = succSommetGrapheTopo[l];
            if (
              potentielSommet.get(sommet)! <
              potentielSommet.get(succ)! + this.getPoids(sommet, succ)
            ) {
              potentielSommet.set(sommet, potentielSommet.get(succ)! + this.getPoids(sommet, succ));
              peresSommet.set(sommet, succ);
            }
          }
        }
      }
    }

    const sommets = Array.from(peresSommet.keys())
      .map((s) => s.toString().padStart(10))
      .reverse()
      .join(" ");
    const potentiels = Array.from(potentielSommet.values())
      .map((pi) => pi.toString().padStart(10))
      .reverse()
      .join(" ");
    const peres = Array.from(peresSommet.values())
      .map((p) => (p === null ? "None".padStart(10) : p.toString().padStart(10)))
      .reverse()
      .join(" ");

    return [sommets, potentiels, peres];
  }
}

class MPM extends DAG {}

const nomFichier = "src/DAG/dag_10_1.gr";
const monGraphe = new DAG(nomFichier);
monGraphe.afficheGraph();

const ordreTopologique = monGraphe.triTopologique();
console.log("Ordre topologique:", ordreTopologique);

const racine = ordreTopologique[0];
const bellMin = monGraphe.bellmanMin(racine);
const bellMax = monGraphe.bellmanMax(racine);
const bellAntiMin = monGraphe.bellmanAntiMin(6);
const bellAntiMax = monGraphe.bellmanAntiMax(6);

console.log(
  "Voici le tableau des poids minimums du graphe :\nSommets    :",
  bellMin[0],
  "\nPotentiels :",
  bellMin[1],
  "\nPeres      :",
  bellMin[2]
);

console.log(
  "Voici le tableau des poids maximums du graphe :\nSommets    :",
  bellMax[0],
  "\nPotentiels :",
  bellMax[1],
  "\nPeres      :",
  bellMax[2]
);

console.log(
  "Voici le tableau des poids minimums(anti arborescence) du graphe :\nSommets    :",
  bellAntiMin[0],
  "\nPotentiels :",
  bellAntiMin[1],
  "\nPeres      :",
  bellAntiMin[2]
);

console.log(
  "Voici le tableau des poids maximums(anti arborescence) du graphe :\nSommets    :",
  bellAntiMax[0],
  "\nPotentiels :",
  bellAntiMax[1],
  "\nPeres      :",
  bellAntiMax[2]
);

monGraphe.enregistrementFichier("testFichier");
