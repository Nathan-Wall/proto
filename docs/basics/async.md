# Proto

## Async Functions

Proto provides a helpful syntax to make declaring and working with asynchronous functions easier.

	// Assuming `ajax` is a function that works similarly to `jQuery.ajax`.
	async loadUserData(id) :{
		return ajax({
			type: 'GET',
			url: '/user-data?id=' & id
		});
	}

	async loadPost(id) :{
		return ajax({
			type: 'GET',
			url: '/post?id=' & id
		});
	}

	async displayUserInfo(id) :{

		// Wait for user data to be loaded, and store in `data` variable
		var data = await loadUserData(id);

		// Log information about the user
		console.log(data.name, data.age);

		// Call `loadPost` for each of the user's post ids and wait for
		// responses from the server for every post.
		var posts = await ...data.posts.map(loadPost);

		// Log the posts
		for post of posts:
			console.log(post);

	}

Async functions are declared with the `async` keyword.  Async functions return a [promise](async/promises.md).  Inside an async function, you can use `await` to pause execution of the function until the promise has been resolved.  The resolution value of the promise can be stored in a variable which can then be used in the rest of the function.

The form `await ...array` can be used to wait for the resolution of an array of promises.  All promises in the array must be resolved before execution will continue.

If the `await` operator is called on a non-Promise operand, the expression will be resolved to the operand itself.

	async foo :{
		var x = await 5;
		console.log(x); // 5
	}

While it's useful to know that promises are the mechanism used to make async functions work, `async` and `await` abstract that detail away from you so that for basic use-cases you don't have to work directly with the promise.