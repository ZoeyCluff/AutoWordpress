module.exports = function render(input, context) {
    context.write('app-hello: Hello ' + input.name);
}