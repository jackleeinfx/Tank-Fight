export class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export class Player extends Entity {
    constructor(x, y) {
        super(x, y);
        this.score = 0;
        this.symbol = '☺'; // Or some other symbol
        this.color = '#fff';
    }
}

export class Letter extends Entity {
    constructor(x, y, char) {
        super(x, y);
        this.char = char;
        this.behaviorType = this.assignBehavior(char);
        this.color = this.generateColor(char);
    }

    assignBehavior(char) {
        // Vowels: Group
        if ("AEIOUaeiou".includes(char)) return 'group';
        // Common Consonants: Wander
        if ("RSTLNrstln".includes(char)) return 'wander';
        // Others (often rarer or hard consonants): Flee
        return 'flee';
    }

    generateColor(char) {
        // Generate a consistent color based on char code
        const code = char.charCodeAt(0);
        // HSL: Hue = code * multiplier, Saturation = 70%, Lightness = 50%
        const hue = (code * 137) % 360;
        return `hsl(${hue}, 70%, 60%)`;
    }
}
