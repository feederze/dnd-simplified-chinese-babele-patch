# Notes

- Modified exporter to support more customized strings

```js
//probs more than this, but i forgot to log it while i make the changes...
//will compare my local exporter with v2.0.0 at some stage
        if (system?.requirements) documentData.requirements = system.requirements;
//...
                if (name) currentActivity.name = name;
                if (roll?.name) currentActivity.roll = roll.name;
                if (activation?.condition) currentActivity.condition = activation.condition;
                if (description?.chatFlavor) currentActivity.chatFlavor = description.chatFlavor;
                if (target?.affects?.special) currentActivity.affectsSpecial = target.affects.special;
                if (range?.special) currentActivity.rangeSpecial = range.special;
```
