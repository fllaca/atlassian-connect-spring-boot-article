/* add-on script */
// Addon functionality

// Elimina un "todo" de la issue
function removeTodo(todo){
	
    var issueId = getIssueKey();
    var data = getData();
    var index = data.indexOf(todo);
    data.splice(index,1)
    var newData = { todos: data};
    AP.require(['request'], function(request) {
        request({
            url: '/rest/api/2/issue/'+issueId+'/properties/todos',
            success: function() {
            	refreshTodoPanel();
            },
            data: JSON.stringify(newData),
            type: "PUT",
            error: function(response) {
                console.error("Error loading API" + response);
            },
            contentType: "application/json"
        });
    }); 
}

// Crea un 'to do' en la issue
function createTodo(){
	// Obtenemos la descripción a partir del input:
	var todo = $('#description-input').val();
	$('#description-input').val("");
	
	// Obtenemos la 'issue key'
    var issueId = getIssueKey();
    // obtenemos los "todo" actuales y metemos uno nuevo
    var data = getData();
    var newData = { todos: data }
    newData.todos.push(todo);
   
    // hacemos la petición a la API rest de JIRA
    AP.require(['request'], function(request) {
        request({
            url: '/rest/api/2/issue/'+issueId+'/properties/todos',
            success: function() {
            	refreshTodoPanel();
            },
            error: function() {
                console.error("Error loading API" + response.status);
            },
            data: JSON.stringify(newData),
            type: "PUT",
            contentType: "application/json"
        });
    });  
}

// Inicializamos el panel
$(function(){
    $('#create-button').click(createTodo);
    refreshTodoPanel(); 
});

// Obtiene los todos y genera dinámicamente la tabla con los mismos
function refreshTodoPanel(){
	var issueId = getIssueKey();
	AP.require(['request'], function(request) {
        request({
            url: '/rest/api/2/issue/'+issueId+'/properties/todos',
            success: function(response) {
            	// Convierte la respuesta a JSON
                response = JSON.parse(response);

                // Llamamos a una función auxiliar para construir la tabla
                buildTodoTable(response.value.todos, "#todo-list");
            },
            error: function() {
                buildTodoTable([], "#todo-list");
            },
            contentType: "application/json"
        });
    });
}

// Crea una tabla con los todos dentro del elemento identificado por 
// el selector pasado en el parámetro
function buildTodoTable(todos, selector) {

    function buildTableAndReturnTbody(hostElement) {
        var projTable = hostElement.append('table')
            .classed({'aui': true});

        // table > thead > tr
        var projHeadRow = projTable.append("thead").append("tr");
        // añadimos cabeceras a la tabla
        projHeadRow.append("th").text("Description");
        projHeadRow.append("th").text("Action");

        return projTable.append("tbody");
    }

    var rootElement = d3.select(selector);
    rootElement.html("");
    var tableBody = buildTableAndReturnTbody(rootElement);
    
    if (!todos.length){
    	tableBody
    		.append("div")
    		.append('span')
    		.classed({'aui-lozenge': true, 'aui-lozenge-success': true})
    		.text("No todos for this issue")
    	return;
    }

    // por cada uno de los todos:
    var row = tableBody.selectAll("tr")
        .data(todos)
        .enter()
        .append("tr");

    // Añadimos un td para la descripción
    row.append("td").append('span')
        .classed({'aui-label': true})
        // el contenido del td será el propio todo
        .text(function(item) { return item; });

    // Finalmente, un td con el 'enlace' de elminar 
    row.append("td").append('span')

        .append("a")
 
        .attr('href', "#")
        .text("remove")
        //personalizaremos el evento 'click'
        .on("click", function (d){
        	removeTodo(d);
        });
}

// obtiene los todos cargados en la tabla html
function getData(){
	return d3.select('#todo-list tbody').selectAll("tr").data();
}

// obtenemos la issuekey que hemos almacenando en un input oculto, a modo de metadato
function getIssueKey(){
	return $('#todos-issue-key').val();
}