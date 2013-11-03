# Design Characteristics

## Prototypal Programming

I've taken ideas explored in [simile](https://github.com/Nathan-Wall/simile) and built them into the language.

JavaScript has a weird mix between using constructor-based object creation and prototypal inheritance.  Its prototypal inheritance system invites you to think of building correlations between objects that are similar.  However, its extensive use of constructors as a medium for object creation often drives people in the direction of thinking in terms of classes.  Constructors become "classes" that define common behavior for similar kinds of objects.

Instead, Proto minimizes the role of constructors in the language, giving them a back seat, and encourages thinking about objects-as-prototypes.  It exposes syntactic and library support to make using ES5's `Object.create` easier and more intuitive.

## Integrity

(See also [High Integrity JavaScript](http://www.youtube.com/watch?v=FrFUI591WhI).)

JavaScript is a very flexible and dynamic language.  Proto aims to be flexible and dynamic as well.  However, in JavaScript this comes with a price.  Although it's possible to achieve a certain amount of integrity in JavaScript, it requires a certain amount of effort and awkward constructs.  One of Proto's goals is to make integrity easily achievable with syntactic support.

## Syntax

One design principles behind Proto is that the human brain is a very powerful computer.  One of its primary purposes is parsing and understanding grammar, syntax, and vocabulary, which it often uses for human language.

Therefore, proto expands and modifies JavaScripts syntax extensively.  I expect that this may make Proto intimidating and harder to learn.  But I also expect that once the brain learns and adjusts to a set of rules, code readability can be increased by moving less important details behind small syntactic symbols, allowing the important parts of code to stand out more clearly.

Syntax has also been modified to remove ambiguity and make the language more extensible.  There have been many proposals brought before ECMAScript that simply don't make the cut because of backwards compatibility reasons and ambiguity in ES syntax.  Proto alleviates ambiguity where it can help readability, prevent bugs, or make the language more extensible.
